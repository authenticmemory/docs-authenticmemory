#!/usr/bin/env node
// Builds the manual: content/**/*.md  ->  docs/**/*.html
//
//  1. Scans the content tree (folders = sections, NN- prefixes = order).
//  2. Regenerates the table of contents in content/index.md, and in any section
//     index.md that contains the toc markers.
//  3. Renders every page to static HTML with the sidebar navigation baked in.
//  4. Writes the search data used by lunr.js in the browser.
//
// The output uses only relative URLs, so it works from file:// or any web host.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import MarkdownIt from 'markdown-it';
import anchor from 'markdown-it-anchor';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'manual.config.json'), 'utf8'));
const DOCS = path.join(ROOT, config.contentDir); // markdown sources
const OUT = path.join(ROOT, config.outDir); // generated site, never edited by hand
const KEEP = new Set(['CNAME']); // files in the output folder that survive a rebuild
const THEME = path.join(ROOT, 'tools', 'theme');
const TOC_START = '<!-- toc:start -->';
const TOC_END = '<!-- toc:end -->';

const posix = path.posix;
const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// "02-data-model.md" -> "data-model.md"
const stripOrder = (name) => name.replace(/^\d+[-_.]/, '');
// "02-data-model.md" -> "Data Model"
const humanize = (name) =>
  stripOrder(name).replace(/\.md$/, '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
// source path -> output path: "02-guides/01-auth.md" -> "guides/auth.html"
const toOut = (src) => src.split('/').map(stripOrder).join('/').replace(/\.md$/, '.html');

function readTitle(file, fallback) {
  const text = fs.readFileSync(file, 'utf8').replace(/^(```|~~~)[\s\S]*?^\1.*$/gm, '');
  const m = text.match(/^#\s+(.+?)\s*#*$/m);
  return m ? m[1] : fallback;
}

// ---------------------------------------------------------------- scan tree

const assets = []; // non-markdown files (images etc.), copied through as-is

function scan(dir, rel = '') {
  const entries = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => !e.name.startsWith('.'))
    .sort((a, b) => a.name.localeCompare(b.name, 'en', { numeric: true }));

  const nodes = [];
  for (const e of entries) {
    const src = posix.join(rel, e.name);
    const abs = path.join(dir, e.name);
    if (e.isDirectory()) {
      const children = scan(abs, src);
      const indexFile = path.join(abs, 'index.md');
      const hasIndex = fs.existsSync(indexFile);
      if (!hasIndex && !children.length) continue;
      nodes.push({
        title: hasIndex ? readTitle(indexFile, humanize(e.name)) : humanize(e.name),
        src: hasIndex ? `${src}/index.md` : null,
        id: toOut(src),
        children,
      });
    } else if (!e.name.endsWith('.md')) {
      assets.push(src);
    } else if (e.name !== 'index.md') {
      nodes.push({ title: readTitle(abs, humanize(e.name)), src, id: toOut(src), children: [] });
    }
  }
  return nodes;
}

// ------------------------------------------------- tables of contents (TOC)

// Links are written relative to `base`, the folder of the file holding the list.
function tocMarkdown(nodes, base = '', depth = 0) {
  return nodes
    .map((n) => {
      const label = n.src ? `[${n.title}](${posix.relative(base, n.src)})` : `**${n.title}**`;
      return `${'  '.repeat(depth)}- ${label}\n${tocMarkdown(n.children, base, depth + 1)}`;
    })
    .join('');
}

// Replace whatever sits between the toc markers. Returns null if the file has none.
function fillToc(text, nodes, base) {
  const start = text.indexOf(TOC_START);
  const end = text.indexOf(TOC_END);
  if (start < 0 || end < start) return null;
  return `${text.slice(0, start)}${TOC_START}\n${tocMarkdown(nodes, base)}${text.slice(end)}`;
}

// The home page always gets the full contents (created or appended if missing).
// A section's index.md gets a list of its own pages wherever it has the markers.
function updateTocs(tree) {
  const changed = [];
  const save = (rel, before, after) => {
    if (after === null || after === before) return;
    fs.writeFileSync(path.join(DOCS, rel), after);
    changed.push(rel);
  };

  const home = path.join(DOCS, 'index.md');
  const before = fs.existsSync(home) ? fs.readFileSync(home, 'utf8') : null;
  const empty = `## Contents\n\n${TOC_START}\n${TOC_END}\n`;
  const text = before === null ? `# ${config.title}\n\n${empty}` : before;
  save('index.md', before, fillToc(text, tree, '') ?? fillToc(`${text.trimEnd()}\n\n${empty}`, tree, ''));

  (function walk(nodes) {
    for (const n of nodes) {
      if (!n.children.length) continue;
      if (n.src) {
        const section = fs.readFileSync(path.join(DOCS, n.src), 'utf8');
        save(n.src, section, fillToc(section, n.children, posix.dirname(n.src)));
      }
      walk(n.children);
    }
  })(tree);
  return changed;
}

// ----------------------------------------------------------------- markdown

const md = new MarkdownIt({ html: true, linkify: true, typographer: true }).use(anchor);

// Rewrite relative links so "../02-guides/01-auth.md#x" points at the built page.
function rewriteUrl(href, page) {
  if (!href || /^([a-z][a-z0-9+.-]*:|\/|#)/i.test(href)) return href;
  const [, p, suffix] = href.match(/^([^?#]*)(.*)$/);
  let target;
  try {
    target = posix.normalize(posix.join(posix.dirname(page.src), decodeURI(p)));
  } catch {
    return href;
  }
  if (target.startsWith('..')) return href;
  target = target.replace(/\/$/, '');
  const abs = path.join(DOCS, target);
  if (fs.existsSync(abs) && fs.statSync(abs).isDirectory()) target = posix.join(target, 'index.md');
  else if (!fs.existsSync(abs)) console.warn(`  warning: broken link "${href}" in ${page.src}`);
  return encodeURI(posix.relative(posix.dirname(page.out), toOut(target))) + suffix;
}

const defaultRender = (tokens, idx, options, env, self) => self.renderToken(tokens, idx, options);
for (const [rule, attr] of [['link_open', 'href'], ['image', 'src']]) {
  const original = md.renderer.rules[rule] || defaultRender;
  md.renderer.rules[rule] = (tokens, idx, options, env, self) => {
    const i = tokens[idx].attrIndex(attr);
    if (i >= 0) tokens[idx].attrs[i][1] = rewriteUrl(tokens[idx].attrs[i][1], env.page);
    return original(tokens, idx, options, env, self);
  };
}
// Let wide tables scroll on small screens instead of breaking the layout.
md.renderer.rules.table_open = () => '<div class="table-wrap"><table>\n';
md.renderer.rules.table_close = () => '</table></div>\n';

const toText = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

// --------------------------------------------------------------------- HTML

// Every branch is rendered collapsed. Branches the reader opens are remembered for
// the browser session only (see NAV_RESTORE), so a fresh visit starts fully collapsed.
function navHtml(nodes, page, depth = 0) {
  if (!nodes.length) return '';
  const items = nodes.map((n) => {
    const current = n.src === page.src;
    const label = n.src
      ? `<a href="${esc(relUrl(page, toOut(n.src)))}"${current ? ' aria-current="page"' : ''}>${esc(n.title)}</a>`
      : `<button type="button" class="nav-label" data-nav-toggle>${esc(n.title)}</button>`;
    if (!n.children.length) return `<li><div class="nav-row">${label}</div></li>`;
    return (
      `<li data-nav-id="${esc(n.id)}"><div class="nav-row">` +
      `<button type="button" class="nav-toggle" data-nav-toggle aria-expanded="false" aria-label="Toggle ${esc(n.title)}"></button>` +
      `${label}</div>` +
      `<ul hidden>${navHtml(n.children, page, depth + 1)}</ul></li>`
    );
  });
  return depth ? items.join('') : `<ul class="nav-list">${items.join('')}</ul>`;
}

const relUrl = (page, out) => posix.relative(posix.dirname(page.out), out);

// Runs inline right after the sidebar so reopened branches never flicker.
const NAV_RESTORE = `<script>try{JSON.parse(sessionStorage.getItem('nav-open')||'[]').forEach(function(id){var li=document.querySelector('#sidebar li[data-nav-id="'+id+'"]');if(li){li.querySelector('.nav-toggle').setAttribute('aria-expanded','true');li.querySelector('ul').hidden=false}})}catch(e){}</script>`;

function pageHtml(page, tree, prev, next) {
  const root = posix.relative(posix.dirname(page.out), '') || '.';
  const r = `${root}/`;
  const pager = [
    prev ? `<a class="prev" href="${esc(relUrl(page, prev.out))}"><span>Previous</span>${esc(prev.title)}</a>` : '<span></span>',
    next ? `<a class="next" href="${esc(relUrl(page, next.out))}"><span>Next</span>${esc(next.title)}</a>` : '<span></span>',
  ].join('');
  const title = page.src === 'index.md' ? config.title : `${page.title} · ${config.title}`;

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<link rel="stylesheet" href="${r}assets/style.css">
<script>(function(){var d=document.documentElement,t=null;try{t=localStorage.getItem('theme');if(localStorage.getItem('nav-collapsed')==='1')d.classList.add('nav-collapsed')}catch(e){}if(t!=='dark'&&t!=='light')t=window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light';d.setAttribute('data-theme',t)})()</script>
</head>
<body data-root="${r}">
<header class="topbar">
  <button type="button" id="sidebar-toggle" class="icon-btn" aria-label="Toggle navigation" aria-controls="sidebar">
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
  </button>
  <a class="brand" href="${esc(config.logoLink)}">
    <img class="logo-light" src="${r}assets/${esc(config.logo)}" alt="Authentic Memory">
    <img class="logo-dark" src="${r}assets/${esc(config.logoDark)}" alt="Authentic Memory">
  </a>
  <div class="search" role="search">
    <input id="search-input" type="search" placeholder="Search…" autocomplete="off" spellcheck="false" aria-label="Search the manual">
    <div id="search-results" class="search-results" hidden></div>
  </div>
  <button type="button" id="theme-toggle" class="icon-btn" aria-label="Switch between light and dark mode" title="Light / dark mode">
    <svg class="icon-moon" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M16.5 12.2A7 7 0 0 1 7.8 3.5a7 7 0 1 0 8.7 8.7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>
    <svg class="icon-sun" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><circle cx="10" cy="10" r="3.4"/><path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3"/></g></svg>
  </button>
</header>
<div id="backdrop" class="backdrop"></div>
<nav id="sidebar" class="sidebar" aria-label="Table of contents">
<a class="nav-home" href="${r}index.html"${page.src === 'index.md' ? ' aria-current="page"' : ''}>Introduction</a>
${navHtml(tree, page)}
</nav>
${NAV_RESTORE}
<main class="content">
<article>
${page.html}
</article>
<nav class="pager" aria-label="Previous and next page">${pager}</nav>
</main>
<script defer src="${r}assets/lunr.min.js"></script>
<script defer src="${r}assets/search-index.js"></script>
<script defer src="${r}assets/app.js"></script>
</body>
</html>
`;
}

// -------------------------------------------------------------------- build

function write(rel, content) {
  const file = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}

// The output folder holds nothing but generated files, so it is emptied on each build.
function cleanOutput() {
  if (!fs.existsSync(OUT)) return;
  for (const name of fs.readdirSync(OUT)) {
    if (!KEEP.has(name)) fs.rmSync(path.join(OUT, name), { recursive: true, force: true });
  }
}

function build() {
  if (!fs.existsSync(DOCS)) throw new Error(`Content folder not found: ${DOCS}`);
  assets.length = 0;
  const tree = scan(DOCS);
  const tocChanged = updateTocs(tree);

  // Flatten to reading order, remembering each page's section trail for search.
  const pages = [{ title: config.title, src: 'index.md', id: 'index.html', trail: [] }];
  (function walk(nodes, trail) {
    for (const n of nodes) {
      if (n.src) pages.push({ title: n.title, src: n.src, id: n.id, trail });
      walk(n.children, [...trail, n.title]);
    }
  })(tree, []);

  for (const page of pages) {
    page.out = toOut(page.src);
    page.html = md.render(fs.readFileSync(path.join(DOCS, page.src), 'utf8'), { page });
  }

  cleanOutput();
  pages.forEach((page, i) => write(page.out, pageHtml(page, tree, pages[i - 1], pages[i + 1])));

  const searchDocs = pages.map((p, i) => ({
    id: i,
    url: p.out,
    title: p.title,
    section: p.trail.join(' › '),
    text: toText(p.html),
  }));
  write('assets/search-index.js', `window.SEARCH_DOCS = ${JSON.stringify(searchDocs)};\n`);

  const require = createRequire(import.meta.url);
  write('assets/lunr.min.js', fs.readFileSync(require.resolve('lunr/lunr.min.js')));
  for (const f of fs.readdirSync(THEME)) write(`assets/${f}`, fs.readFileSync(path.join(THEME, f)));
  for (const a of assets) write(toOut(a), fs.readFileSync(path.join(DOCS, a)));
  write('.nojekyll', ''); // GitHub Pages: serve the files as-is

  const rel = (p) => path.relative(ROOT, p);
  console.log(`Built ${pages.length} pages -> ${rel(OUT)}/index.html${tocChanged.length ? ` (contents updated in ${tocChanged.join(', ')})` : ''}`);
}

build();

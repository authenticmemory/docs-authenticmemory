#!/usr/bin/env node
// Builds the manual: content/**/*.md  ->  docs/**/*.html
//
//  1. Scans the content tree (folders = sections, NN- prefixes = order).
//  2. Regenerates the table of contents inside content/index.md.
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

// ---------------------------------------------------- content/index.md (TOC)

function tocMarkdown(nodes, depth = 0) {
  return nodes
    .map((n) => {
      const label = n.src ? `[${n.title}](${n.src})` : `**${n.title}**`;
      return `${'  '.repeat(depth)}- ${label}\n${tocMarkdown(n.children, depth + 1)}`;
    })
    .join('');
}

function updateIndexMd(tree) {
  const file = path.join(DOCS, 'index.md');
  const block = `${TOC_START}\n${tocMarkdown(tree)}${TOC_END}`;
  const before = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  let after;
  if (before === null) {
    after = `# ${config.title}\n\n## Contents\n\n${block}\n`;
  } else if (before.includes(TOC_START) && before.includes(TOC_END)) {
    after =
      before.slice(0, before.indexOf(TOC_START)) +
      block +
      before.slice(before.indexOf(TOC_END) + TOC_END.length);
  } else {
    after = `${before.trimEnd()}\n\n## Contents\n\n${block}\n`;
  }
  if (after !== before) fs.writeFileSync(file, after);
  return after !== before;
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

function navHtml(nodes, page, depth = 0) {
  if (!nodes.length) return '';
  const items = nodes.map((n) => {
    const current = n.src === page.src;
    const open = n.children.length && (current || page.id.startsWith(`${n.id}/`));
    const label = n.src
      ? `<a href="${esc(relUrl(page, toOut(n.src)))}"${current ? ' aria-current="page"' : ''}>${esc(n.title)}</a>`
      : `<button type="button" class="nav-label" data-nav-toggle>${esc(n.title)}</button>`;
    if (!n.children.length) return `<li><div class="nav-row">${label}</div></li>`;
    return (
      `<li><div class="nav-row">` +
      `<button type="button" class="nav-toggle" data-nav-toggle aria-expanded="${open ? 'true' : 'false'}" aria-label="Toggle ${esc(n.title)}"></button>` +
      `${label}</div>` +
      `<ul${open ? '' : ' hidden'}>${navHtml(n.children, page, depth + 1)}</ul></li>`
    );
  });
  return depth ? items.join('') : `<ul class="nav-list">${items.join('')}</ul>`;
}

const relUrl = (page, out) => posix.relative(posix.dirname(page.out), out);

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
<script>try{if(localStorage.getItem('nav-collapsed')==='1')document.documentElement.classList.add('nav-collapsed')}catch(e){}</script>
</head>
<body data-root="${r}">
<header class="topbar">
  <button type="button" id="sidebar-toggle" class="icon-btn" aria-label="Toggle navigation" aria-controls="sidebar">
    <svg viewBox="0 0 20 20" width="20" height="20" aria-hidden="true"><path d="M3 5h14M3 10h14M3 15h14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
  </button>
  <a class="brand" href="${r}index.html">${esc(config.title)}</a>
  <div class="search" role="search">
    <input id="search-input" type="search" placeholder="Search…" autocomplete="off" spellcheck="false" aria-label="Search the manual">
    <div id="search-results" class="search-results" hidden></div>
  </div>
</header>
<div id="backdrop" class="backdrop"></div>
<nav id="sidebar" class="sidebar" aria-label="Table of contents">
${navHtml(tree, page)}
</nav>
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
  const tocChanged = updateIndexMd(tree);

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
  console.log(`Built ${pages.length} pages -> ${rel(OUT)}/index.html${tocChanged ? ' (table of contents in index.md updated)' : ''}`);
}

build();

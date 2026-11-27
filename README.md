# Authentic Memory docs
See [docs.authenticmemory.org](https://docs.authenticmemory.org)

## How it works

The manual is written in Markdown under [content/](content/). A small build script turns it
into static HTML in [docs/](docs/), which is the complete, self-contained site: open
`docs/index.html` straight from disk, or serve the folder from any static host.

For this repo and online manual we are using GitHub Pages which publishes from the `/docs` directory.

```sh
npm install      # once: installs the build tools and enables the pre-commit hook
npm run build    # rebuild the HTML
npm run watch    # rebuild whenever a file changes
```

Every commit runs the build through the pre-commit hook and adds the result, so the
HTML never falls behind the Markdown.

## Writing pages

- **A page** is a `.md` file. Its first `# Heading` is its title in the navigation.
- **A section** is a folder. Its `index.md` is the section's own page; folders can nest.
- **Order** comes from the numeric prefix: `01-installation.md`, `02-configuration.md`.
  The prefix is dropped from the URL, so pages can be reordered without breaking links.
- **Images** and other files go in `content/` next to the pages that use them.
- **Links** between pages point at the Markdown file (`../02-guides/01-authentication.md`).
  They work on GitHub as written and are converted to `.html` in the built site.
- **`content/index.md`** is the home page. It is entirely hand-written.
- **Section contents** can be generated: put the lines `<!-- toc:start -->` and
  `<!-- toc:end -->` in a section's `index.md` and the build fills in the list of pages
  in that section between them. Without the markers, the page is left as you wrote it.
- **Do not edit anything in `docs/`**. It is emptied and regenerated on every build
  (only a `CNAME` file is kept). The look and
  behaviour live in [tools/theme/](tools/theme/), including the header logo; the logo's link
  and the title shown in browser tabs are in `manual.config.json`.

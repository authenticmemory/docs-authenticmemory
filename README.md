Developer documentation hosted at docs.authenticmemory.org

## How it works

The manual is written in Markdown under [docs/](docs/). A small build script turns it into
static HTML in the same folder, so `docs/` is the complete, self-contained site: open
`docs/index.html` straight from disk, or serve the folder from any static host
(for GitHub Pages, publish from the `/docs` folder of `main`).

```sh
npm install      # once: installs the build tools and enables the pre-commit hook
npm run build    # rebuild the HTML
npm run watch    # rebuild whenever a file changes
```

Every commit runs the build through the pre-commit hook and adds the result, so the
table of contents in `docs/index.md` and the HTML never fall behind the Markdown.

## Writing pages

- **A page** is a `.md` file. Its first `# Heading` is its title in the navigation.
- **A section** is a folder. Its `index.md` is the section's own page; folders can nest.
- **Order** comes from the numeric prefix: `01-installation.md`, `02-configuration.md`.
- **Links** between pages point at the Markdown file (`../02-guides/01-authentication.md`).
  They work on GitHub as written and are converted to `.html` in the built site.
- **`docs/index.md`** is the home page. The list between `<!-- toc:start -->` and
  `<!-- toc:end -->` is regenerated on each build; everything outside it is yours to edit.
- **Do not edit `.html` files or `docs/assets/`**. They are regenerated. The look and
  behaviour live in [tools/theme/](tools/theme/); the site title is in `manual.config.json`.

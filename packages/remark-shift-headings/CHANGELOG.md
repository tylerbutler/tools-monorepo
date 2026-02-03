# remark-shift-headings

## 0.1.1

### Patch Changes

- Add unified/remark/rehype plugin packages for markdown processing _[`#574`](https://github.com/tylerbutler/tools-monorepo/pull/574) [`5d1efd6`](https://github.com/tylerbutler/tools-monorepo/commit/5d1efd6f22e5b1da6f87a02838d73a4295f4597f) [@tylerbutler](https://github.com/tylerbutler)_

  New packages:
  - **remark-repopo-policies** - Generate documentation tables from repopo config
  - **remark-lazy-links** - Transform `[*]` placeholders into numbered references
  - **remark-shift-headings** - Adjust heading levels for content embedding
  - **rehype-footnotes** - Transform GFM footnotes for Littlefoot.js integration

## 0.1.0

### Minor Changes

- Add remark-shift-headings plugin _[`#380`](https://github.com/tylerbutler/tools-monorepo/pull/380) [`b82f20d`](https://github.com/tylerbutler/tools-monorepo/commit/b82f20d50823b916404302b0cf9ba14c18818d4d) [@tylerbutler](https://github.com/tylerbutler)_

  New remark plugin to shift heading levels based on rendering context. Automatically adjusts heading levels for Astro content collections and pages, with support for frontmatter overrides.

# Changelog

## 0.1.1

### Patch Changes

- Add unified/remark/rehype plugin packages for markdown processing _[`#574`](https://github.com/tylerbutler/tools-monorepo/pull/574) [`5d1efd6`](https://github.com/tylerbutler/tools-monorepo/commit/5d1efd6f22e5b1da6f87a02838d73a4295f4597f) [@tylerbutler](https://github.com/tylerbutler)_

  New packages:
  - **remark-repopo-policies** - Generate documentation tables from repopo config
  - **remark-lazy-links** - Transform `[*]` placeholders into numbered references
  - **remark-shift-headings** - Adjust heading levels for content embedding
  - **rehype-footnotes** - Transform GFM footnotes for Littlefoot.js integration

<details><summary>Updated 1 dependency</summary>

<small>

[`c3d1b65`](https://github.com/tylerbutler/tools-monorepo/commit/c3d1b65299f58b9fa605ebd18e7fb4346ae7745f) [`c3d1b65`](https://github.com/tylerbutler/tools-monorepo/commit/c3d1b65299f58b9fa605ebd18e7fb4346ae7745f) [`1582ad1`](https://github.com/tylerbutler/tools-monorepo/commit/1582ad1abc79b211492dba2e5172e995c9c47fe0)

</small>

- `repopo@0.9.0`

</details>

## 0.1.0

- Initial release
- Generate policy documentation tables from repopo config files
- Support for HTML markers for idempotent updates
- Preserve user-edited descriptions

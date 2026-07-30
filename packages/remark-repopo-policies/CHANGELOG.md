# Changelog

## 1.0.0

### Major Changes

- 1.0 Release _[`#761`](https://github.com/tylerbutler/tools-monorepo/pull/761) [`e448512`](https://github.com/tylerbutler/tools-monorepo/commit/e44851237eaafa1acbda4a5072fbd7da38951ec4) [@tylerbutler](https://github.com/tylerbutler)_

  API is stable. Future changes will follow SemVer.

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`b263d07`](https://github.com/tylerbutler/tools-monorepo/commit/b263d07c531baf032f5f8a75444971b91c55f2ab) [`bd06230`](https://github.com/tylerbutler/tools-monorepo/commit/bd06230247adf908155ce2a9e35ba0ed5aebac3c) [`0972973`](https://github.com/tylerbutler/tools-monorepo/commit/0972973fa9df873d3dde101836adb9ff9196b8f8)

</small>

- `repopo@0.11.1`

</details>

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

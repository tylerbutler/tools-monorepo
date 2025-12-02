# rehype-footnotes

## 0.1.1

### Patch Changes

- Fix href/id mismatch in footnote references. Updates href attributes to match transformed footnote definition IDs (fn:X format), enabling Littlefoot.js to properly pair references with footnotes. _[`#502`](https://github.com/tylerbutler/tools-monorepo/pull/502) [`ba0aa1b`](https://github.com/tylerbutler/tools-monorepo/commit/ba0aa1b0c147e4d0b0999d6bda1eeda7ef64c440) [@tylerbutler](https://github.com/tylerbutler)_

## 0.1.0

### Minor Changes

- Add rehype-footnotes plugin _[`#380`](https://github.com/tylerbutler/tools-monorepo/pull/380) [`b82f20d`](https://github.com/tylerbutler/tools-monorepo/commit/b82f20d50823b916404302b0cf9ba14c18818d4d) [@tylerbutler](https://github.com/tylerbutler)_

  New rehype plugin to transform GFM footnotes for Littlefoot.js integration. Adds required attributes, removes back-references, and includes utility functions for Littlefoot script and CSS generation.

# @tylerbu/sorted-btree-es6

## 2.1.0

### Minor Changes

- Sync with upstream btree-typescript and modernize toolchain _[`#600`](https://github.com/tylerbutler/tools-monorepo/pull/600) [`9a8201d`](https://github.com/tylerbutler/tools-monorepo/commit/9a8201d4f70cba3e3243a632e5abcb438f2c48f4) [@tylerbutler](https://github.com/tylerbutler)_

  **New extended features from upstream:**
  - `bulkLoad` - Efficiently load sorted entries in O(n) time
  - `diffAgainst` - Compare two BTrees and iterate differences
  - `intersect` - Create intersection of two BTrees
  - `subtract` - Create difference of two BTrees
  - `union` - Create union of two BTrees
  - `decompose` - Split tree into subtrees for parallel processing
  - `parallelWalk` - Walk multiple trees in parallel
  - `forEachKeyInBoth` / `forEachKeyNotIn` - Set operations on keys

  **Toolchain modernization:**
  - Target ES2020 instead of ES5
  - Use node16 module resolution for TypeScript 5 compatibility
  - Update Jest to v29, ts-jest to v29, TypeScript to v5.1
  - Move tests to `test/` directory with comprehensive test coverage

  **Bug fixes:**
  - Fix temporal dead zone issue in `forEachKeyNotIn` by reordering declarations

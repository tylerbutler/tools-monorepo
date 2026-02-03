---
"@tylerbu/sorted-btree-es6": minor
---

Sync with upstream btree-typescript and modernize toolchain

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
- Replace uglify-js with terser for minification
- Update Jest to v29, ts-jest to v29, TypeScript to v5.1
- Move tests to `test/` directory with comprehensive test coverage

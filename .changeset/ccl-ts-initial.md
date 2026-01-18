---
"ccl-ts": minor
---

Add TypeScript implementation of CCL (Categorical Configuration Language) parser

- `parse()` function converts CCL text into flat Entry arrays
- `buildHierarchy()` transforms flat entries into nested CCLObject structures
- Support for comments, continuation lines, and indentation-based nesting
- Full TypeScript type definitions for Entry, CCLObject, and CCLValue types
- Integration with ccl-test-data test suite for validation

---
"tree-sitter-ccl": patch
---

feat: Add tree-sitter grammar for CCL (Categorical Configuration Language)

Initial release of the tree-sitter-ccl package with:
- Complete grammar definition for CCL syntax
- C external scanner for CCL baseline-sensitive parsing
- Node.js and Rust language bindings
- Syntax highlighting queries
- TypeScript definitions for Node.js API
- Comprehensive test suite

Preserve nested comments, empty values, inline continuations, and list blocks.
Support slash-prefixed keys, arbitrary multiline keys, and comments at EOF.
Keep sibling entries separate in injected documents. Include native prebuild
loading, source-build fallback files, and matching Node TypeScript declarations.

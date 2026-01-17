---
"ccl-ts": major
---

Migrate to Result types using true-myth

All fallible functions now return `Result<T, E>` instead of throwing exceptions:
- `parse()` returns `Result<Entry[], ParseError>`
- `buildHierarchy()` returns `Result<CCLObject, ParseError>`
- Typed accessors (`getString`, `getInt`, `getBool`, `getFloat`, `getList`) return `Result<T, AccessError>`
- `canonicalFormat()` returns `Result<string, ParseError>`

Re-exports `ok`, `err`, `Result`, `Ok`, and `Err` from true-myth for convenience.

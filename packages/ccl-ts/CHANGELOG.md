# ccl-ts

## 0.2.0

### Minor Changes

- Add TypeScript implementation of CCL (Categorical Configuration Language) _[`#538`](https://github.com/tylerbutler/tools-monorepo/pull/538) [`d485ff9`](https://github.com/tylerbutler/tools-monorepo/commit/d485ff93255e16822961680be9b3e21c100e1bc9) [@tylerbutler](https://github.com/tylerbutler)_

  **Core parsing:**
  - `parse()` converts CCL text into flat Entry arrays
  - `buildHierarchy()` transforms flat entries into nested CCLObject structures
  - Support for comments, continuation lines, and indentation-based nesting
  - Full TypeScript type definitions for Entry, CCLObject, and CCLValue types

  **Typed access functions:**
  - `getString()`: Extract string values with type validation
  - `getInt()`: Parse integer strings with strict validation
  - `getBool()`: Parse boolean strings (true/false, case-insensitive)
  - `getFloat()`: Parse floating-point strings with validation
  - `getList()`: Access list values with automatic empty-key list detection

  All functions use variadic path arguments for navigation (e.g., `getString(obj, "server", "host")`).

  **Result types:**
  All fallible functions return `Result<T, E>` instead of throwing exceptions, using the true-myth library. Re-exports `ok`, `err`, `Result`, `Ok`, and `Err` for convenience.

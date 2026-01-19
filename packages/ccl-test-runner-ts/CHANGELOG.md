# ccl-test-runner-ts

## 0.2.0

### Minor Changes

- Add TypeScript test runner for CCL implementations _[`#528`](https://github.com/tylerbutler/tools-monorepo/pull/528) [`be38140`](https://github.com/tylerbutler/tools-monorepo/commit/be3814098f5c29d82eef6067a5247891dccb8d92) [@tylerbutler](https://github.com/tylerbutler)_
  - Vitest integration with declarative API for wiring up CCL implementations
  - Capability-based test filtering (functions, features, behaviors, variants)
  - CLI tool (`ccl-download-tests`) for downloading test data from GitHub releases
  - Custom vitest matchers for CCL test assertions
  - Schema validation with types derived from ccl-test-data JSON schema
  - Skip summary reporter for tracking unimplemented test cases
  - Bundled test data for offline/CI usage

- Add Result type support for typed access function validation _[`#563`](https://github.com/tylerbutler/tools-monorepo/pull/563) [`93cf171`](https://github.com/tylerbutler/tools-monorepo/commit/93cf171a3b435eb7be0ed044e55cab8873ddf223) [@tylerbutler](https://github.com/tylerbutler)_
  - Add `AccessError` type for typed access error handling
  - Re-export `Result`, `Ok`, `Err`, `ok`, `err` from true-myth
  - Update validation handlers to work with Result-returning implementations
  - Add true-myth as a dependency

- Add validation handlers for typed access functions _[`#556`](https://github.com/tylerbutler/tools-monorepo/pull/556) [`a5df733`](https://github.com/tylerbutler/tools-monorepo/commit/a5df7339ed47c350f4b69be1fd95ef9f183cf7ca) [@tylerbutler](https://github.com/tylerbutler)_
  - `handleGetStringValidation`: Validates getString function behavior
  - `handleGetIntValidation`: Validates getInt function behavior
  - `handleGetBoolValidation`: Validates getBool function behavior
  - `handleGetFloatValidation`: Validates getFloat function behavior
  - `handleGetListValidation`: Validates getList function behavior

  Handlers convert test data path arguments to variadic arguments for CCL implementations.

### Patch Changes

- Features are now metadata-only and no longer affect test filtering. Tests now run regardless of feature declarations, making it easier to see which tests pass or fail without needing to configure features upfront. _[`#558`](https://github.com/tylerbutler/tools-monorepo/pull/558) [`b8adf6c`](https://github.com/tylerbutler/tools-monorepo/commit/b8adf6c0048c6e9aa7653d2c5c64d02f74d211a0) [@tylerbutler](https://github.com/tylerbutler)_
- Add `toplevel_indent` behavior support for test filtering _[`#538`](https://github.com/tylerbutler/tools-monorepo/pull/538) [`d485ff9`](https://github.com/tylerbutler/tools-monorepo/commit/d485ff93255e16822961680be9b3e21c100e1bc9) [@tylerbutler](https://github.com/tylerbutler)_

  The test runner now supports the `toplevel_indent` behavior option which controls how indentation is handled for top-level entries. This enables implementations to specify whether they use `toplevel_indent_strip` (remove leading indentation) or `toplevel_indent_preserve` (keep original indentation) behavior.

<details><summary>Updated 1 dependency</summary>

<small>

</small>

- `dill-cli@0.4.1`

</details>

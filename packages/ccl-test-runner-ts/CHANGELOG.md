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

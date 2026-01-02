---
"ccl-test-runner-ts": minor
---

Add TypeScript test runner for CCL implementations

- Vitest integration with declarative API for wiring up CCL implementations
- Capability-based test filtering (functions, features, behaviors, variants)
- CLI tool (`ccl-download-tests`) for downloading test data from GitHub releases
- Custom vitest matchers for CCL test assertions
- Schema validation with types derived from ccl-test-data JSON schema
- Skip summary reporter for tracking unimplemented test cases
- Bundled test data for offline/CI usage

---
"ccl-test-runner-ts": minor
---

Add Result type support for typed access function validation

- Add `AccessError` type for typed access error handling
- Re-export `Result`, `Ok`, `Err`, `ok`, `err` from true-myth
- Update validation handlers to work with Result-returning implementations
- Add true-myth as a dependency

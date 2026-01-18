---
"ccl-test-runner-ts": minor
---

Add validation handlers for typed access functions

- `handleGetStringValidation`: Validates getString function behavior
- `handleGetIntValidation`: Validates getInt function behavior
- `handleGetBoolValidation`: Validates getBool function behavior
- `handleGetFloatValidation`: Validates getFloat function behavior
- `handleGetListValidation`: Validates getList function behavior

Handlers convert test data path arguments to variadic arguments for the ccl-ts implementation.

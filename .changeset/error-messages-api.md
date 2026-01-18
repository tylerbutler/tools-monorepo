---
"repopo": major
"sort-tsconfig": patch
---

**BREAKING CHANGE**: Change `PolicyFailure.errorMessage` to `errorMessages` array.

The `PolicyFailure` interface now uses `errorMessages: string[]` instead of `errorMessage?: string`. This allows policies to report multiple error messages per failure and provides clearer semantics.

Additionally, a new optional `manualFix?: string` property has been added to provide user guidance on how to resolve policy failures manually.

Migration:
- Change `errorMessage: "message"` to `errorMessages: ["message"]`
- For multiple messages, use `errorMessages: ["msg1", "msg2"]`
- When checking failures, use `errorMessages.join("\n")` instead of `errorMessage`

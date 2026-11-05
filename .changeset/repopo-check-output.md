---
"repopo": minor
---

Add interactive progress and completion summaries to `check`, with fixed, unresolved, and execution-error counts. Show detailed timing and skipped work in verbose mode. Quiet mode hides progress, successful fixes, and summaries while retaining unresolved findings, execution errors, and failure exit status.

Disable progress animation in CI, redirected output, quiet mode, and verbose mode. Identify `check` as the stable TypeScript command and `check-native` as experimental; native output parity remains separate.

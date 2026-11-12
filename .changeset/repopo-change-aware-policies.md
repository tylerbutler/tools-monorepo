---
"repopo": minor
---

Add a full repository inventory annotated with added, modified, deleted, renamed, type-changed, or unchanged status. Support PR, local, and staged comparisons with explicit base overrides and shared TypeScript/native behavior.

Use `RequireCompanionChanges` to require related path updates, such as documentation changes alongside source changes. Existing file selection and full repository inventory retain their behavior.

Configure comparisons with `changes: { mode?, base? }`. The CLI uses its explicit base override first, then CI's target, then the configured base.

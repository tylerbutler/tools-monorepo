---
"repopo": minor
---

Add the opt-in `MaxChangedFiles` policy with required configuration `{ maxFiles: number }`. Report a violation when the eligible changed-file count exceeds the nonnegative integer limit; exactly the limit passes.

Count additions, modifications, deletions, type changes, and renames once per change record. Honor global and per-policy exclusions, and use the existing PR/local/staged change snapshot independently of stdin selection. Findings include the count, limit, and guidance to reduce or split the change.

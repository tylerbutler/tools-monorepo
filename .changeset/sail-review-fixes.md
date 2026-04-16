---
"@tylerbu/sail": patch
---

Maintenance and correctness improvements from code review:

- Implement `printExecError` function that was previously a no-op with a TODO comment; now logs errors and warnings via the `debug` module
- Replace sync file I/O (`existsSync`, `statSync`) with async equivalents in `PersistentFileHashCache`
- Remove leftover debug code in `atomicWrite.ts` that dynamically imported `existsSync` for manifest-specific logging
- Add `debug`-based logging in `statistics.ts` where errors were previously silently swallowed

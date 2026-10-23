---
"repopo": minor
---

Add compile-only policy preparation and a validated Git-private, per-worktree cache for native execution. Use `repopo prepare` to prepare explicitly, or let the first native check prepare automatically.

Native checks now default to `--mode auto`: use QuickJS for supported code, or select IPC for the whole run before config evaluation. Use `--mode quickjs` to require QuickJS and `--mode ipc` to bypass preparation. Initialization and policy errors never trigger a backend retry.

Run file and repository policies in one QuickJS context with one config evaluation. Valid warm direct-core checks and listings require no Node/Bun helper. Keep runtime config and environment values live rather than caching evaluated values.

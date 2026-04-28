---
"@tylerbu/cli-api": minor
---

feat(cli-api): composition-based capability system

A new composition-based capability system is now available as an alternative to the inheritance-based `CommandWithConfig` and `GitCommand` base classes. Commands can mix and match capabilities via `useGit()` and `useConfig()` instead of choosing a single base class. Existing base classes remain fully functional.

**Core API:**

- `createLazy()` / `LazyCapability<T>` — lazy-init primitive with concurrent-safe caching and standardized init-error handling.
- `useGit(command, options)` — exposes `git` (SimpleGit), `repository`, and helpers (`getCurrentBranch`, `isCleanWorkingTree`, `hasUncommittedChanges`).
- `useConfig(command, options)` — config-file loading with multi-path search and default-config fallback.

**Type safety:**

- Discriminated unions: `GitContext = GitContextInRepo | GitContextNoRepo`, `ConfigContext = ConfigContextFound<T> | ConfigContextNotFound`.
- Overloads on `required` — `useGit(cmd, { required: true })` / `useConfig(cmd, { required: true })` return the narrowed in-repo / found variant directly, removing call-site narrowing.
- `DEFAULT_CONFIG_LOCATION` branded sentinel replaces magic `"DEFAULT"` strings.

**Distribution:**

- New `@tylerbu/cli-api/capabilities` subpath export.

**Breaking changes:**

- `ConfigFileFlag` renamed to `ConfigFlag` and moved into `flags.ts`. `ConfigFlag` now exposes a `-c` shorthand in addition to `--config`.
- `ConfigFileFlagHidden` renamed to `ConfigFlagHidden`. The hidden variant intentionally omits `-c` so subclasses spreading it can claim `-c` for their own purposes.

Update imports from `@tylerbu/cli-api` accordingly.

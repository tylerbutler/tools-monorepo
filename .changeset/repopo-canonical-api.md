---
"repopo": minor
"sort-tsconfig": minor
"remark-repopo-policies": patch
---

Adopt the canonical Repopo 1.0 authoring and execution API. This is an
**intentional breaking change**, released as a minor while the packages are
pre-1.0. Update custom policies and configurations together; see the
[migration guide](https://repopo.tylerbutler.com/usage/migration/).

- Define objects with `satisfies FilePolicyDefinition<C>` or
  `satisfies RepositoryPolicyDefinition<C>`. Use `PolicyDefinition` and
  `ConfiguredPolicy` for common unions. Remove retired policy classes,
  definition/factory aliases, result formats, and result guards.
- Use only `makePolicy(definition, { config, exclude, instanceId })`. Replace
  positional config and third-argument settings. Instance exclusions use
  `exclude`; repository-global `RepopoConfig.excludeFiles` remains supported.
  Repeated policy names require explicit unique instance IDs.
- Declare required configuration with `requiresConfig: true`, with complete
  explicit settings or a complete default. Omitted/undefined config selects
  defaults; explicit config replaces the entire default. Allowed null remains
  supplied. A config's own `exclude` field does not exclude work.
- Both scopes return finding arrays; `[]` passes. Findings use `message`,
  optional `manualFix`, and `fixStatus: "available" | "fixed" | "failed"`.
  Only fixed resolves, and fixed findings remain visible. Fixed/failed are
  invalid in check mode. Standalone file resolvers receive and return findings;
  omitted findings stay unresolved, and `[]` is not blanket success. Preserve
  messages and duplicate-message order when updating findings.
- Keep async/generator handlers and file-type define helpers. Use
  `definePackagePolicy` instead of its retired generator alias. Built-in
  configuration types now have complete public exports and generated coverage.
- Use Promise `runPolicies(options)` or Effection `PolicyRunner(options).run()`
  with shared options and findings/errors/skipped/perfStats output. Errors keep
  original causes. Registration/input errors throw; execution errors collect.
  Fix execution errors stop later work on that file and skip repository work,
  or stop subsequent repository fixers. Unresolved findings do not trigger
  exception boundaries. Cancellation waits for owned cleanup; writes are not
  rolled back.
- Repository policies require explicit full inventory or an async loader.
  Selected files never substitute for inventory. Empty selection/inventory
  still runs repository checks; loaders refresh after file fixes and between
  repository fixers. `LicenseFileExists` and `SharedDependencyVersions` now use
  repository scope, including during stdin runs.
- `repopo/api` provides the programmatic API without OCLIF's CLI `run` export.
  The root adds CLI `run`; `repopo/policies` supplies built-ins. API reports and
  reference documentation cover all three entry points. Keep `type-fest` as a
  production dependency for public declarations.
- Both CLI engines share validation and findings contracts. Native execution
  retains Rust matching/routing/scheduling with per-policy sidecar execution.
  Regex exclusions preserve flags; strings remain case-insensitive regexes.

`sort-tsconfig` intentionally changes its exported `SortTsconfigsPolicy` to a
canonical file definition with finding-array results. Direct handler consumers
must handle arrays and fix statuses instead of retired success/failure values.
Configure it with the same `makePolicy` options object shown above.

`remark-repopo-policies` reads canonical instance exclusions from `exclude`, so
generated policy tables retain exclusion details after the API migration.

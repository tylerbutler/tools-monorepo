# Changelog

## 1.0.1

### Patch Changes

- Adopt the canonical Repopo 1.0 authoring and execution API. This is an _[`#811`](https://github.com/tylerbutler/tools-monorepo/pull/811) [`d76e9e7`](https://github.com/tylerbutler/tools-monorepo/commit/d76e9e72c8d75863a97517ca662001aa567207da) [@tylerbutler](https://github.com/tylerbutler)_

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
<details><summary>Updated 1 dependency</summary>

<small>

[`5e6c97b`](https://github.com/tylerbutler/tools-monorepo/commit/5e6c97b9afa99c93b1728ee0e48b45fa0a130501) [`d76e9e7`](https://github.com/tylerbutler/tools-monorepo/commit/d76e9e72c8d75863a97517ca662001aa567207da) [`ca340db`](https://github.com/tylerbutler/tools-monorepo/commit/ca340dbefce4e967ecf73a043207ec13b0651213) [`c401c9c`](https://github.com/tylerbutler/tools-monorepo/commit/c401c9c7ab783222afac4df6de0b421dbe215093) [`1333d28`](https://github.com/tylerbutler/tools-monorepo/commit/1333d287abdee51a01a22540914600877fe8f557)

</small>

- `repopo@0.13.0`

</details>

## 1.0.0

### Major Changes

- 1.0 Release _[`#761`](https://github.com/tylerbutler/tools-monorepo/pull/761) [`e448512`](https://github.com/tylerbutler/tools-monorepo/commit/e44851237eaafa1acbda4a5072fbd7da38951ec4) [@tylerbutler](https://github.com/tylerbutler)_

  API is stable. Future changes will follow SemVer.

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`b263d07`](https://github.com/tylerbutler/tools-monorepo/commit/b263d07c531baf032f5f8a75444971b91c55f2ab) [`bd06230`](https://github.com/tylerbutler/tools-monorepo/commit/bd06230247adf908155ce2a9e35ba0ed5aebac3c) [`0972973`](https://github.com/tylerbutler/tools-monorepo/commit/0972973fa9df873d3dde101836adb9ff9196b8f8) [`fe789fd`](https://github.com/tylerbutler/tools-monorepo/commit/fe789fd4cb33fcab19a63ad2f132b5d91c8a0c73) [`32f5afe`](https://github.com/tylerbutler/tools-monorepo/commit/32f5afee62c6ba732650ca23f1669e0c2b2c73df)

</small>

- `repopo@0.11.1`

</details>

## 0.1.1

### Patch Changes

- Add unified/remark/rehype plugin packages for markdown processing _[`#574`](https://github.com/tylerbutler/tools-monorepo/pull/574) [`5d1efd6`](https://github.com/tylerbutler/tools-monorepo/commit/5d1efd6f22e5b1da6f87a02838d73a4295f4597f) [@tylerbutler](https://github.com/tylerbutler)_

  New packages:
  - **remark-repopo-policies** - Generate documentation tables from repopo config
  - **remark-lazy-links** - Transform `[*]` placeholders into numbered references
  - **remark-shift-headings** - Adjust heading levels for content embedding
  - **rehype-footnotes** - Transform GFM footnotes for Littlefoot.js integration

<details><summary>Updated 1 dependency</summary>

<small>

[`c3d1b65`](https://github.com/tylerbutler/tools-monorepo/commit/c3d1b65299f58b9fa605ebd18e7fb4346ae7745f) [`c3d1b65`](https://github.com/tylerbutler/tools-monorepo/commit/c3d1b65299f58b9fa605ebd18e7fb4346ae7745f) [`1582ad1`](https://github.com/tylerbutler/tools-monorepo/commit/1582ad1abc79b211492dba2e5172e995c9c47fe0)

</small>

- `repopo@0.9.0`

</details>

## 0.1.0

- Initial release
- Generate policy documentation tables from repopo config files
- Support for HTML markers for idempotent updates
- Preserve user-edited descriptions

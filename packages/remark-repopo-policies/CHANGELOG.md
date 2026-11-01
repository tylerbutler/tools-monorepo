# Changelog

## 1.0.1

### Patch Changes

- Introduce a shared API for file and repository policies, with consistent check results and fix status reporting. _[`#811`](https://github.com/tylerbutler/tools-monorepo/pull/811) [`d76e9e7`](https://github.com/tylerbutler/tools-monorepo/commit/d76e9e72c8d75863a97517ca662001aa567207da) [@tylerbutler](https://github.com/tylerbutler)_

	
	**Breaking change:** Update custom policies and configurations together.
	This change is released as a minor version while the packages are pre-1.0.
	See the [migration guide](https://repopo.tylerbutler.com/usage/migration/) for replacements for removed APIs and complete examples.
	
	Key migration steps for `repopo`:
	
	- Define policies as objects with `satisfies FilePolicyDefinition<C>` or `satisfies RepositoryPolicyDefinition<C>` instead of policy classes or factory aliases. Use `definePackagePolicy` instead of `generatePackagePolicy`.
	- Configure policies with `makePolicy(definition, { config, exclude, instanceId })` instead of positional configuration or a third argument. Instance exclusions use `exclude`; global `RepopoConfig.excludeFiles` remains supported. Repeated instances of the same policy need unique `instanceId` values.
	- Mark required configuration with `requiresConfig: true` and supply complete settings or a complete default. Omitted or `undefined` configuration selects the default; explicit configuration replaces it without merging.
	- Return arrays of findings instead of the previous success and failure results. An empty handler result passes. Findings use `message`, optional `manualFix`, and optional `fixStatus: "available" | "fixed" | "failed"`. Only `"fixed"` resolves a finding; `"fixed"` and `"failed"` are valid only in fix mode. Standalone resolvers must return the findings they update; returning `[]` does not resolve the original findings.
	- Run policies with `runPolicies(options)` for Promise-based code or `new PolicyRunner(options).run()` for Effection code. Results separate `findings`, `errors`, `skipped`, and `perfStats`. Input and registration errors throw; policy execution errors are collected.
	- Supply the full repository `inventory` or an async inventory loader when running repository policies programmatically. Use a loader to refresh the inventory after file fixes and between repository fixes. `LicenseFileExists` and `SharedDependencyVersions` now check the whole repository, even with an empty file selection or `--stdin`. Repository fixes can modify files outside the selected list.
	
	In fix mode, an execution error stops later work on the affected file and skips repository policies, or stops later repository policies if the error occurs in that phase.
	Completed writes are not rolled back.
	Both `check` and `check-native` follow these rules.
	
	Import the programmatic API from `repopo/api` and built-in policies from `repopo/policies`.
	The root `repopo` entry point also exports the CLI's `run` function.
	
	For `sort-tsconfig`, the exported `SortTsconfigsPolicy` is now a file policy definition.
	Configure it with the same `makePolicy` options object.
	If you call its handler directly, update your code to handle finding arrays and fix statuses.
	
	For `remark-repopo-policies`, generated policy tables now read instance exclusions from `exclude`, so exclusion details remain visible after migration.
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

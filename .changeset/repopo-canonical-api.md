---
"repopo": minor
"sort-tsconfig": minor
"remark-repopo-policies": patch
---

Introduce a shared API for file and repository policies, with consistent check results and fix status reporting.

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

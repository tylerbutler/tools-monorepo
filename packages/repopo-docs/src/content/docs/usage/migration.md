---
title: Migrate to the 1.0 API
description: Update policy definitions, configuration, results, and programmatic runners.
---

This is an intentional breaking API change, released as a **minor** while
Repopo is pre-1.0. Update custom policies and configuration together.

## Names and entry points

| Retired API | Replacement |
| --- | --- |
| `PolicyShape`, policy classes, `makePolicyDefinition` | Object literals with `satisfies FilePolicyDefinition<C>` or `satisfies RepositoryPolicyDefinition<C>` |
| `PolicyInstance` | `ConfiguredPolicy` (or its scope-specific types) |
| `policy()` | `makePolicy()` |
| `generatePackagePolicy` | `definePackagePolicy` |
| `PolicyError`, `PolicyFailure`, `PolicyFixResult`, result guards | `PolicyFinding` and `PolicyResult` arrays |
| `PolicyStandaloneResolver` | `PolicyResolver` |

`PolicyDefinition` is the union of file and repository definitions. Keep
`definePackagePolicy`, `defineCargoPolicy`, `defineGleamPolicy`, and
`defineFileHeaderPolicy` for parsed manifests and file headers.

Import authoring types, factories, adapters, `runPolicies`, and `PolicyRunner`
from `repopo/api`. It intentionally does not export OCLIF's `run`. The root
`repopo` exports that API plus the CLI `run`. Import built-in definitions and
their configuration types from `repopo/policies`. The root and API also export
built-in configuration types. All three entry points have generated reference
documentation and API reports.

## One factory options object

Replace positional configuration and third-argument settings with:

```ts
import { makePolicy, type RepopoConfig } from "repopo/api";
import { PackageJsonProperties } from "repopo/policies";

export default {
	excludeFiles: ["^vendor/"],
	policies: [
		makePolicy(PackageJsonProperties, {
			config: { verbatim: { license: "MIT" } },
			exclude: [/^fixtures\//],
			instanceId: "package-license",
		}),
	],
} satisfies RepopoConfig;
```

Only `makePolicy(definition, { config, exclude, instanceId })` is supported.
There is no positional-config overload, third argument, argument guessing,
or instance `excludeFiles` alias. A configuration object's own `exclude`
field remains configuration; it does not exclude work.

`RepopoConfig.excludeFiles` remains the repository-global option. Programmatic
runners call this option `exclude`. Exclusion strings are case-insensitive
regular expressions, not globs; RegExp values keep their flags.
Invalid global or per-instance regex strings fail registration before any policy
handler, resolver, or inventory loader runs, in both engines.

A single instance can use its policy name as its ID. Repeated policy names
require explicit, unique `instanceId` values. IDs do not depend on array order.

## Required configuration and defaults

Set `requiresConfig: true` when a policy cannot run without configuration.
Use `satisfies`, not a broad annotation that erases that literal metadata:

```ts
import { makePolicy, type FilePolicyDefinition } from "repopo/api";

interface Settings {
	required: string;
}

const RequireText = {
	name: "RequireText",
	description: "Require configured text in matching files.",
	match: /\.txt$/,
	requiresConfig: true,
	handler: async ({ file, root, config }) => {
		const { readFile } = await import("node:fs/promises");
		const { join } = await import("pathe");
		if (config === undefined) throw new TypeError("RequireText needs config.");
		const text = await readFile(join(root, file), "utf8");
		return text.includes(config.required)
			? []
			: [{ message: `Missing text: ${config.required}` }];
	},
} satisfies FilePolicyDefinition<Settings>;

const configured = makePolicy(RequireText, { config: { required: "License" } });
```

Supply a **complete** `defaultConfig` to make explicit configuration optional.
Omitted or explicitly `undefined` configuration selects that default.
Explicit configuration replaces the whole default; Repopo does not merge it.
An allowed `null` stays supplied and does not select the default.
Registration checks required configuration even for structurally supplied
configured objects. Built-ins such as `PackageJsonProperties`, the header
policies, and the focused script policies require configuration.

The following built-ins also require explicit configuration; none supplies a
default or silently skips validation when configuration is omitted:

| Policy | Configure |
| --- | --- |
| `PackageAllowedScopes` | Allowed scopes and/or unscoped package names |
| `PackagePrivateField` | Publishing/private patterns and unmatched-package behavior |
| `PackageEsmType` | `requiredType` or `detectFromExports: true` |
| `PackageTestScripts` | Test directories and/or framework dependencies; required scripts default to `["test"]` |
| `PackageScripts` | Script requirements, exact values, or other validation rules |
| `GleamSharedDependencyVersions` | `packages` paths to the Gleam manifests to compare |
| `GleamMonorepoConsistency` | `packages` paths to compare, and optional consistency settings |

For example, use `makePolicy(PackageEsmType, { config: { requiredType: "module" } })`
or `makePolicy(PackageTestScripts, { config: { testDependencies: ["vitest"] } })`.
Configuration is repository-specific: Repopo does not choose allowed scopes,
publishing rules, test frameworks, or monorepo members for you. Existing
per-field defaults still apply to explicitly supplied configuration.

## Findings, not booleans or result wrappers

Both handler scopes return `Promise<PolicyResult>` or an Effection
`Operation<PolicyResult>`, where `PolicyResult = readonly PolicyFinding[]`.
Keep async functions or generator handlers; synchronous result functions are
not supported.

```ts
// Pass:
return [];
// Report independent violations:
return [
	{ message: "Missing header", fixStatus: "available" },
	{ message: "Review license", manualFix: "Ask the package owner." },
];
// After an inline fix, in fix mode only:
return [{ message: "Missing header", fixStatus: "fixed" }];
```

Only `"fixed"` resolves a finding. Fixed findings remain in output.
`"available"`, `"failed"`, and omitted status are unresolved. `"fixed"` and
`"failed"` are invalid in check mode. Use `resolve` in handler arguments to
decide whether to write files.

File findings must not supply `files`; the runner supplies `file`. Repository
findings may supply `files: ["package.json", "packages/tool/package.json"]`,
an empty array, or no locations. Locations must be repository-relative paths
with forward slashes, without empty, `.` or `..` components.

## Standalone file resolvers

File definitions can keep a `resolver`. Repository fixes must be inline.
The resolver receives `{ file, root, config, findings }` and returns findings:

```ts
import type { PolicyResolver } from "repopo/api";

const resolver: PolicyResolver = async ({ findings }) => {
	// After successfully applying the actual file changes:
	return findings.map((finding) => ({ ...finding, fixStatus: "fixed" }));
};
```

In fix mode, a nonempty handler result calls the resolver unless any inline
finding has status `"fixed"` or `"failed"`. Either status suppresses standalone
resolution for that invocation.

Keep each original message and duplicate-message occurrence order. Matching
resolver findings update those originals. New messages append. Omitted
findings stay unresolved: returning `[]` is **not** blanket success. Omitted
manual guidance is retained; explicit `undefined` can clear it. A resolver
exception preserves the checked findings and adds an execution error.

## Runner options and results

```ts
import { makePolicy, runPolicies } from "repopo/api";
import { NoJsFileExtensions } from "repopo/policies";

const results = await runPolicies({
	policies: [makePolicy(NoJsFileExtensions)],
	root: process.cwd(),
	files: ["src/main.mjs"],
	inventory: ["src/main.mjs", "README.md"],
	exclude: ["^vendor/"],
	fix: false,
	concurrency: 8,
	signal: new AbortController().signal,
});

const failed = results.errors.length > 0 ||
	results.findings.some((finding) => finding.fixStatus !== "fixed");
```

For Effection, use `yield* new PolicyRunner(options).run()` inside an operation,
or `await run(() => new PolicyRunner(options).run())` with `run` imported from
`effection`. Both runners share options and results; there is no files argument
to `.run()`.

`PolicyRunResults` separates `findings`, `errors`, `skipped`, and `perfStats`.
Findings identify `policy`, stable `policyId`, and `scope`. File findings have
`file`; repository findings have optional `files`. Execution errors include
`phase: "handle" | "resolve"`, `kind: "contract" | "exception"`, a message,
the original `cause`, and scope-safe locations. Repository error locations are
the eligible inventory. Skips identify the policy and scope and use reason
`"excluded"`, `"file-fix-error"`, or `"repository-fix-error"`.
`perfStats` provides `count`, `processed`, and per-action/per-instance timing
maps in milliseconds. Excluded work alone is not failure.

Input and registration errors throw. Read-only execution errors collect and
later work continues. In fix mode, a file execution error stops later work on
that file, continues other files, and skips the repository phase. A repository
execution error skips subsequent repository policies. Unresolved or failed
findings do not activate these exception boundaries.

Both CLIs fail on execution errors or unresolved findings. Cancellation
propagates after owned resources are released. Fixes already written are not
rolled back; there is no rollback guarantee.

## Full inventory is not selection

Repository definitions require `scope: "repository"` and receive
`{ root, files, resolve, config }`, never a synthetic file.
Programmatic callers **must** supply the full `inventory` array or an async
loader when repository policies are present. Selected `files` are never used
as a substitute. Selection limits only file policies. Empty selection and
empty inventory still run repository policies once each, after file policies.
Global and instance exclusions filter each repository policy's inventory, but
do not suppress that invocation.

An inventory array is a static snapshot. To observe file additions or removals
after file fixes and between repository fixers, pass a loader:

```ts
inventory: async () => listAllRepositoryFiles()
```

Implement `listAllRepositoryFiles` with your application's inventory source.
Read-only runs load inventory once when needed. Fix runs refresh after file
fixes and before subsequent repository fixers. New files do not expand the
original file selection. Inventory-loader errors reject the run.

The CLIs load full Git inventory independently of `--stdin`. Repository fixes
can modify files outside stdin. `LicenseFileExists` and
`SharedDependencyVersions` now use repository scope.

## Execution engines

`check` uses the TypeScript runner. `check-native` retains Rust matching,
routing, and scheduling, with per-policy sidecar execution and shared result
validation. Native policy cancellation waits for cleanup before exit. Both
engines use the contracts above; native execution is not a separate authoring
API.

# repopo package guidance

Repopo checks and fixes repository standards. The binary is `repopo`;
`./bin/dev.js` runs source and `./bin/run.js` runs compiled output.
Configuration is `repopo.config.ts` (or `.cjs`/`.mjs`) at the repository root.

## Canonical authoring API

- Write object literals with `satisfies FilePolicyDefinition<C>` or
  `satisfies RepositoryPolicyDefinition<C>`. `PolicyDefinition` is their union.
- File definitions have `name`, `description`, `match`, and `handler`.
  Repository definitions require `scope: "repository"` and have no standalone
  resolver. File scope is the default.
- Configure with **only** `makePolicy(definition, { config, exclude, instanceId })`.
  Options can be omitted. The result is a `ConfiguredPolicy`.
- Keep `requiresConfig: true` literal metadata. Required configuration needs
  complete explicit config or a complete `defaultConfig`.
- Omitted/undefined config selects defaults. Explicit config replaces the whole
  default, without merging. Allowed null stays supplied.
- Config fields named `exclude` do not become instance exclusions.
- `RepopoConfig.excludeFiles` is global; instance and runner options use `exclude`.
  Strings are case-insensitive regexes, not globs. RegExp flags are preserved.
- Repeated policy names require explicit unique instance IDs.

```ts
import { makePolicy, type RepopoConfig } from "repopo/api";
import { NoJsFileExtensions, PackageJsonProperties } from "repopo/policies";

export default {
	excludeFiles: ["^vendor/"],
	policies: [
		makePolicy(NoJsFileExtensions, { exclude: ["^bin/"] }),
		makePolicy(PackageJsonProperties, {
			config: { verbatim: { license: "MIT" } },
		}),
	],
} satisfies RepopoConfig;
```

Omitted policies enable `NoJsFileExtensions`,
`PackageJsonRepoDirectoryProperty`, and `PackageJsonSorted`; `[]` disables all.
Other built-ins are opt-in. Header and focused script policies require settings.

## Findings and resolution

Async functions and Effection generator handlers return
`PolicyResult = readonly PolicyFinding[]`; `[]` passes. Findings use `message`,
optional `manualFix`, and optional `fixStatus: "available" | "fixed" | "failed"`.
Only fixed resolves. Fixed findings stay visible; fixed/failed are invalid in
check mode. File findings cannot supply `files`; repository findings may supply
repo-relative forward-slash locations.

File handlers receive `{ file, root, resolve, config }`; repository handlers
receive `{ files, root, resolve, config }`. Gate inline writes on `resolve`.
Standalone file resolvers receive `{ file, root, config, findings }` and return
findings. Any inline fixed/failed status suppresses standalone resolution.
Preserve messages and duplicate-message order to update findings. Omitted
findings stay unresolved; `[]` is not blanket success.

Keep `definePackagePolicy`, `defineCargoPolicy`, `defineGleamPolicy`, and
`defineFileHeaderPolicy`. Parsed-manifest handlers receive parsed content as
their first argument and return the same finding arrays. Helpers preserve
required/default metadata. `fromFluidHandlers` adapts Fluid's external contract.

## Programmatic execution

`repopo/api` exports authoring types, helpers, adapters, `runPolicies`, and
`PolicyRunner`, without OCLIF's `run`. `repopo` adds that CLI export.
`repopo/policies` exports built-ins and settings types.

```ts
import { makePolicy, runPolicies } from "repopo/api";
import { NoJsFileExtensions } from "repopo/policies";

const results = await runPolicies({
	policies: [makePolicy(NoJsFileExtensions)],
	root: process.cwd(),
	files: ["src/main.mjs"],
	fix: false,
	concurrency: 8,
});
```

The Effection equivalent is `yield* new PolicyRunner(options).run()`.
Both APIs share `policies`, `root`, `files`, `inventory`, `exclude`, `fix`,
`concurrency`, and `signal` options, and return findings/errors/skipped/perfStats.
Findings and errors have explicit scope, stable identity, and scope-safe
locations; execution errors preserve original causes.

Repository policies require explicit full inventory or an async loader.
Selection limits file policies only. Empty selection/inventory still runs
repository checks. Arrays are snapshots; loaders refresh after file fixes and
between repository fixers. The CLI loads full Git inventory independently of stdin.

Input/registration errors throw. Read-only execution errors collect and work
continues. Fix file errors stop that file's remaining work, continue other files,
and skip repository work. Repository errors skip subsequent repository fixers.
Unresolved/failed findings do not trigger these boundaries. CLI errors and
unresolved findings fail; excluded work does not. Cancellation releases owned
resources before propagating, without rollback of writes.

## Execution engines

`check` uses the TypeScript runner. `check-native` retains Rust matching,
routing, and scheduling. The sidecar executes per-policy units with shared
validation. Native cancellation waits for policy cleanup. Do not expose internal
executor/cache/normalized-handler/exclusion-map state as public API.

## Commands and artifacts

From the monorepo root:

```bash
pnpm nx run repopo:build:compile
pnpm nx run repopo:build:api
pnpm nx run repopo:build:manifest
pnpm nx run repopo:build:readme
pnpm nx run repopo:test:vitest
pnpm nx run repopo-docs:build:site
./packages/repopo/bin/dev.js check
git diff --name-only | ./packages/repopo/bin/dev.js check --stdin
```

`build:api` generates separate reports/models for `repopo`, `repopo/api`, and
`repopo/policies`. The docs site's TypeDoc integration covers all three.
Do not edit generated reports/pages. CLI README sections come from OCLIF.
Use targeted tests with canonical finding arrays; generator tests must run in an
Effection scope. Follow workspace formatting, path, and async I/O conventions.

See the [migration guide](../repopo-docs/src/content/docs/usage/migration.md)
and [custom policy guide](../repopo-docs/src/content/docs/policies/custom.md).

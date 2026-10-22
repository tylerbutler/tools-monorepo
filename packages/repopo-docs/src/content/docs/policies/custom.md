---
title: Custom policies
---

## Object definitions

Use an object literal with `satisfies FilePolicyDefinition<C>` or
`satisfies RepositoryPolicyDefinition<C>`. `PolicyDefinition` is their union.
Configure definitions with `makePolicy` to produce `ConfiguredPolicy` values.

```ts
import { readFile } from "node:fs/promises";
import { join } from "pathe";
import { makePolicy, type FilePolicyDefinition, type RepopoConfig } from "repopo/api";

const NoTodoComments = {
	name: "NoTodoComments",
	description: "Require TODO comments to be resolved.",
	match: /\.ts$/,
	handler: async ({ file, root }) => {
		const text = await readFile(join(root, file), "utf8");
		return text.includes("TODO")
			? [{ message: "File contains TODO comments", manualFix: "Resolve the TODO." }]
			: [];
	},
} satisfies FilePolicyDefinition;

export default {
	policies: [makePolicy(NoTodoComments)],
} satisfies RepopoConfig;
```

Both scopes return `PolicyResult = readonly PolicyFinding[]`. An empty array
passes. Async functions and Effection generators are supported. Findings use
`message`, optional `manualFix`, and optional `fixStatus`: `"available"`,
`"fixed"`, or `"failed"`. Only fixed resolves; fixed findings remain visible.
Fixed/failed are invalid in check mode. Use `resolve` to gate writes.
File handlers must not supply `files`.

Use `requiresConfig: true` for required settings. Keep literal metadata with
`satisfies`. A complete `defaultConfig` makes explicit config optional.
Explicit config replaces, rather than merges, defaults. Allowed null remains
supplied; missing/undefined config uses defaults.

## Parsed manifests and headers

`definePackagePolicy`, `defineCargoPolicy`, and `defineGleamPolicy` parse the
matching manifest and pass it as the first handler argument. They preserve
required/default configuration metadata. `defineFileHeaderPolicy` generates
file-header matching and replacement rules and requires header settings unless
it has a complete default.

```ts
import { definePackagePolicy } from "repopo/api";

export const NamedPackage = definePackagePolicy({
	name: "NamedPackage",
	description: "Require a package name.",
	handler: async (json) => json.name ? [] : [{ message: "Missing package name" }],
});
```

## Repository checks

```ts
import type { RepositoryPolicyDefinition } from "repopo/api";

export const RequiredReadme = {
	name: "RequiredReadme",
	description: "Require a repository README.",
	scope: "repository",
	handler: async ({ files }) => files.includes("README.md")
		? []
		: [{ message: "Missing README.md", manualFix: "Add a root README.md." }],
} satisfies RepositoryPolicyDefinition;
```

Repository handlers receive `{ root, files, resolve, config }`. Findings may
include repository-relative forward-slash `files` locations, even several
locations for one finding. Omit `files` for a repository-level finding.
Repository fixers are inline only. They run after file policies even when
selection or eligible inventory is empty. Programmatic callers must supply
explicit full inventory; selected paths do not substitute for it.

## Standalone file fixes

Use `FilePolicyDefinition.resolver` with a `PolicyResolver`. The resolver
receives `{ file, root, config, findings }` and returns findings. After writing
the actual changes, return the original messages with `fixStatus: "fixed"`.
Inline fixed/failed findings suppress standalone resolution for that invocation.
Keep duplicate-message occurrence order. New messages append; omitted findings
remain unresolved. Returning `[]` does not resolve all findings. Resolver
exceptions retain checked findings and add a structured execution error.

## Useful manual guidance

Name the preferred implementation, point to an example, and explain what the
author must preserve:

```ts
return [{
	message: "Package-level project.json splits task configuration.",
	manualFix: [
		"Put implementation commands in package.json scripts.",
		"Put shared orchestration in root nx.json.",
		"Follow packages/repopo/package.json as an example.",
		"Preserve required tasks and caching settings.",
	].join("\n"),
}];
```

Use existing linters for rules they support. Reserve fixes for changes that
preserve behavior without an architectural decision.

## FluidFramework adapter

`fromFluidHandlers` converts Fluid handlers to file definitions:

```ts
import { fromFluidHandlers, makePolicy } from "repopo/api";
import type { FluidHandler } from "repopo/api";

export function configureFluid(handlers: FluidHandler[]) {
	return fromFluidHandlers(handlers, { namePrefix: "Fluid:" })
		.map((definition) => makePolicy(definition));
}
```

Fluid handlers still accept absolute paths and return an error string or
undefined. Fluid resolvers return `{ resolved, message? }`. The adapter maps
them to Repopo finding arrays and statuses. This adapter-specific contract
does not change the canonical Repopo handler or resolver contract.

See [the migration guide](/usage/migration/) for configuration, runner outputs,
execution-error boundaries, inventory refresh, and cancellation.

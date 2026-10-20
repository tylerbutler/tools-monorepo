---
title: Custom policies
description: A guide to creating your own policies and integrating existing handlers.
sidebar:
  order: 3
---

## Creating Custom Policies

File policies run once per matching selected file. Repository policies run once per invocation, after all file policies. Configure both with `policy()` in the same `policies` array.

## Repository policies

Use `RepositoryPolicyDefinition` for checks that require several files or check for a missing file. Set `scope: "repository"` and omit `match`.

```ts title="repopo.config.ts"
import { policy, type RepopoConfig, type RepositoryPolicyDefinition } from "repopo";
import { NoJsFileExtensions } from "repopo/policies";

const RequiredReadme: RepositoryPolicyDefinition = {
	name: "RequiredReadme",
	description: "Requires a README at the repository root.",
	scope: "repository",
	handler: async ({ files }) =>
		files.includes("README.md")
			? true
			: [{ error: "README.md is missing.", manualFix: "Add README.md." }],
};

export default {
	policies: [policy(NoJsFileExtensions), policy(RequiredReadme)],
} satisfies RepopoConfig;
```

Repository handlers receive `root`, `files`, `resolve`, and `config`. `root` is the absolute Git root. `files` contains repo-relative paths from `git ls-files -co --exclude-standard --full-name`, after global and per-policy exclusions. This includes tracked and untracked files, but not ignored untracked files. Paths do not guarantee that a file still exists on disk.

Return `true` to pass, or an array of findings. Each finding has an `error` message and can include `files`, `fixable`, `fixed`, and `manualFix`. Use `files` for a violation that concerns several files. Omit it for a repository-level violation. An empty array also passes. Async functions and Effection generators are supported.

Use `resolve` to apply fixes inside the handler, and set `fixed` on each finding to report the result. Repository policies do not use standalone resolvers.

### Partial runs and fixes

With `--stdin`, file policies check only the supplied paths. Repository policies still run, even with empty stdin, and receive the full eligible repository inventory. Exclusions filter their inventory; they do not prevent execution when the inventory is empty.

Repository policies run serially in configuration order after file policies finish. In fix mode, the inventory is refreshed before each repository policy. A repository fixer can modify files outside the stdin selection. These rules apply to both `check` and `check-native`.

For programmatic execution, pass the full inventory separately from the file selection:

```ts
await run(() => runner.run(selectedFiles, repositoryFiles));
```

`run` is imported from `effection`. Pass an async inventory loader instead of an array if fixes can create or remove files. If the second argument is omitted, the runner uses the selected files as the inventory; this is suitable only for full-repository runs.

### Built-in repository policies

`LicenseFileExists` checks for a license file at the repository root. `SharedDependencyVersions` compares dependency versions across members of the root Cargo workspace when `Cargo.toml` is in its eligible inventory.

Configure either policy with `policy()`. Both run during partial and empty stdin checks. If you call their handlers directly, pass the full eligible `files` inventory and handle `true` or an array of findings.

## Guidance for policy failures

Return `manualFix` with a policy error to explain how to correct the violation.
Both `repopo check` and `repopo check-native` print this guidance for unresolved
failures, including failed auto-fix attempts. They omit it after a successful fix.
If a standalone resolver fails without its own guidance, they print the original
handler's guidance.

For architectural policies, name the preferred implementation, point to an example,
and explain what the author must preserve:

```ts
return {
	error: "Package-level project.json files split task configuration.",
	manualFix: [
		"Put implementation commands in package.json scripts.",
		"Put shared orchestration in root nx.json.",
		"Follow packages/repopo/package.json as an example.",
		"Preserve required tasks and caching settings during migration.",
	].join("\n"),
};
```

Keep repository-specific decisions in custom policies. Use existing linters for
rules they support. Reserve auto-fixes for changes that preserve behavior without
an architectural decision.

## FluidFramework Handler Adapter

If you're migrating from FluidFramework's build-tools or want to reuse existing Fluid policy handlers, repopo provides an adapter to convert them to repopo policies.

### Converting Handlers

Use `fromFluidHandlers` to convert FluidFramework handlers to repopo policies:

```ts title="repopo.config.ts"
import { fromFluidHandlers, makePolicy } from "repopo";
import { copyrightFileHeaderHandlers, fluidCaseHandler } from "@fluidframework/build-tools";

// Convert multiple handlers with a namespace prefix
const FluidCopyrightPolicies = fromFluidHandlers(copyrightFileHeaderHandlers, {
  namePrefix: "Fluid:"  // Results in "Fluid:my-handler-name"
});

// For a single handler, wrap it in an array
const [FluidCasePolicy] = fromFluidHandlers([fluidCaseHandler]);

const config = {
  policies: [
    ...FluidCopyrightPolicies.map(p => makePolicy(p)),
    makePolicy(FluidCasePolicy),
  ]
};

export default config;
```

### Handler Interface

The adapter accepts handlers matching the FluidFramework `Handler` interface:

```ts
interface FluidHandler {
  // Display name for filtering and output
  name: string;

  // Regex pattern for matching files
  match: RegExp;

  // Check function: returns undefined (pass) or error message (fail)
  handler: (file: string, root: string) => Promise<string | undefined>;

  // Optional resolver for auto-fix support
  resolver?: (file: string, root: string) =>
    Promise<{ resolved: boolean; message?: string }> |
    { resolved: boolean; message?: string };
}
```

### Key Differences Handled

The adapter automatically handles differences between the two systems:

| Aspect | FluidFramework | repopo |
|--------|---------------|--------|
| File paths | Absolute paths | Repo-relative paths |
| Return type | `string \| undefined` | `true \| PolicyFailure` |
| Resolver | Separate function | Integrated or standalone |

### Options

```ts
interface FluidAdapterOptions {
  // Prefix for policy names (useful for namespacing)
  namePrefix?: string;
}
```

### Import Paths

```ts
// Main export
import { fromFluidHandlers } from "repopo";

// Types
import type { FluidHandler, FluidAdapterOptions } from "repopo";
```

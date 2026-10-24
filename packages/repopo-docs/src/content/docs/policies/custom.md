---
title: Custom policies
description: A guide to creating your own policies and integrating existing handlers.
sidebar:
  order: 7
---

A policy is an object with a name, a description, and a handler function. There are two kinds:

- **File policies** have a `match` regular expression. They run once for each selected file whose repo-relative path matches.
- **Repository policies** set `scope: "repository"`. They run once per check, after all file policies.

Write a policy as an object literal with `satisfies FilePolicyDefinition<C>` or `satisfies RepositoryPolicyDefinition<C>`, where `C` is the type of its configuration. `PolicyDefinition` is the union of both. Using `satisfies` rather than a type annotation keeps literal metadata such as `requiresConfig: true`. Configure both kinds with `makePolicy()` in the same `policies` array.

## File policies

A file policy handler receives `{ file, root, resolve, config }`:

- `file` is the repo-relative path.
- `root` is the absolute path of the repository root.
- `resolve` is `true` when the user ran `check --fix`. Only write files when it's `true`.
- `config` is the configuration passed to `makePolicy()`, or the policy's `defaultConfig`.

The handler returns an array of **findings**. An empty array means the file passes. Each finding describes one violation:

| Field | Description |
| --- | --- |
| `message` | Required. What's wrong. |
| `manualFix` | Instructions for fixing the violation by hand. |
| `fixStatus` | `"available"` if `--fix` can fix it, or `"fixed"` / `"failed"` to report the outcome of a fix the handler attempted. |

```ts title="repopo.config.ts"
import { readFile } from "node:fs/promises";
import { join } from "pathe";
import { makePolicy, type FilePolicyDefinition, type RepopoConfig } from "repopo/api";

const NoTodoComments = {
	name: "NoTodoComments",
	description: "Disallows TODO comments in TypeScript sources.",
	match: /^src\/.*\.ts$/,
	handler: async ({ file, root }) => {
		const text = await readFile(join(root, file), "utf8");
		return text.includes("TODO")
			? [{ message: "File contains TODO comments.", manualFix: "Resolve or remove the TODO." }]
			: [];
	},
} satisfies FilePolicyDefinition;

export default {
	policies: [makePolicy(NoTodoComments)],
} satisfies RepopoConfig;
```

Handlers can be async functions or [Effection](https://frontside.com/effection) generator functions. Synchronous handlers aren't supported.

Only `fixStatus: "fixed"` resolves a finding. Fixed findings still appear in the output so users can see what changed. A finding with `"available"`, `"failed"`, or no status is unresolved and fails the check. Returning `"fixed"` or `"failed"` without `--fix` is an error. File findings can't set `files`; repopo supplies the file.

### Configuration

Declare a configuration type with the `C` parameter. Then choose one of these:

- Set `requiresConfig: true` if the policy can't run without configuration. Configuring it without `config` is then an error that stops the check before any policy runs.
- Set a **complete** `defaultConfig` to make configuration optional.

```ts
interface RequireTextConfig {
	required: string;
}

const RequireText = {
	name: "RequireText",
	description: "Requires configured text in matching files.",
	match: /\.txt$/,
	requiresConfig: true,
	handler: async ({ file, root, config }) => {
		if (config === undefined) throw new TypeError("RequireText needs config.");
		const text = await readFile(join(root, file), "utf8");
		return text.includes(config.required)
			? []
			: [{ message: `Missing text: ${config.required}` }];
	},
} satisfies FilePolicyDefinition<RequireTextConfig>;

makePolicy(RequireText, { config: { required: "License" } });
```

Explicit configuration replaces the whole `defaultConfig`; repopo doesn't merge them.

## Policy definers

For common files, the definer functions match the file, read and parse it, and pass the parsed content to your handler as its first argument. They keep `requiresConfig` and `defaultConfig`.

| Function | Matches | Handler receives |
| --- | --- | --- |
| `definePackagePolicy` | `package.json` | Parsed JSON |
| `defineCargoPolicy` | `Cargo.toml` | Parsed TOML |
| `defineGleamPolicy` | `gleam.toml` | Parsed TOML |
| `defineFileHeaderPolicy` | Your `match` | Generates header checks and fixes; requires header configuration |

```ts
import { definePackagePolicy } from "repopo/api";

export const RequireDescription = definePackagePolicy({
	name: "RequireDescription",
	description: "Requires a description in every package.json.",
	handler: async (json) =>
		json.description ? [] : [{ message: "Missing description." }],
});
```

## Standalone file resolvers

A file policy can put its fix in a separate `resolver` instead of fixing in the handler. In fix mode, repopo calls the resolver when the handler returns findings. It receives `{ file, root, config, findings }` and returns the updated findings:

```ts
import type { PolicyResolver } from "repopo/api";

const resolver: PolicyResolver = async ({ findings }) => {
	// Apply the actual file changes first, then:
	return findings.map((finding) => ({ ...finding, fixStatus: "fixed" }));
};
```

- Return each original finding with the same `message`, in the same order, to update it. Findings with new messages are added.
- Findings you leave out stay unresolved. Returning `[]` does **not** mark everything fixed.
- If the handler already returned a finding with `"fixed"` or `"failed"`, the resolver isn't called for that file.
- If the resolver throws, the handler's findings are kept and the error is reported.

Repository policies can't have a resolver; they fix inline in the handler.

## Repository policies

Use a repository policy for checks that involve several files or a file that's missing. Set `scope: "repository"` and omit `match`.

```ts title="repopo.config.ts"
import { makePolicy, type RepopoConfig, type RepositoryPolicyDefinition } from "repopo/api";

const RequiredReadme = {
	name: "RequiredReadme",
	description: "Requires a README at the repository root.",
	scope: "repository",
	handler: async ({ files }) =>
		files.includes("README.md")
			? []
			: [{ message: "README.md is missing.", manualFix: "Add a root README.md." }],
} satisfies RepositoryPolicyDefinition;

export default {
	policies: [makePolicy(RequiredReadme)],
} satisfies RepopoConfig;
```

Repository handlers receive `{ root, files, resolve, config }`:

- `root` is the absolute Git root.
- `files` contains repo-relative paths from `git ls-files -co --exclude-standard --full-name`, after global and per-instance exclusions. This includes tracked and untracked files, but not ignored untracked files. A path doesn't guarantee the file still exists on disk.

Repository findings can set `files` to the repo-relative paths a violation concerns, using forward slashes and no `.` or `..` segments. Omit `files` for a repository-level violation. Repository policies fix inline: check `resolve`, apply the fix, and return the finding with `fixStatus: "fixed"`.

### Partial runs and fixes

With `--stdin`, file policies check only the supplied paths. Repository policies still run, even with empty stdin, and receive the full eligible repository inventory. Exclusions filter their inventory; they don't prevent the policy from running when the inventory is empty.

Repository policies run one at a time in configuration order after file policies finish. In fix mode, the inventory is refreshed before each repository policy, and a repository fixer can modify files outside the stdin selection. These rules apply to both `check` and `check-native`. To run repository policies from your own code, pass the full inventory explicitly; see the [programmatic API](/usage/programmatic-api/#selected-files-and-the-repository-inventory).

## Concurrency and manifest snapshots

Read-only checks process up to 8 files at a time. Use `--concurrency <n>` with `check` or `check-native` to change the limit, or the `concurrency` option for programmatic runs. Use `--concurrency 1` if a custom policy depends on sequential file processing. The policies for one file run in configuration order.

During read-only checks, `definePackagePolicy`, `defineCargoPolicy`, and `defineGleamPolicy` reuse the first read and parse of each manifest for that run. Each handler receives its own copy of the parsed object. Don't change files during a read-only run: later handlers see the first parsed snapshot. Custom file reads and repository policies don't use this cache.

With `--fix`, files are processed one at a time and the manifest cache is bypassed, regardless of `--concurrency`, so later fixers see the changes from earlier ones. Repository policies start after file policies finish.

## Guidance for policy failures

Return `manualFix` with a finding to explain how to correct the violation. Both `repopo check` and `repopo check-native` print it for unresolved findings.

For architectural policies, name the preferred implementation, point to an example, and explain what the author must preserve:

```ts
return [{
	message: "Package-level project.json files split task configuration.",
	manualFix: [
		"Put implementation commands in package.json scripts.",
		"Put shared orchestration in root nx.json.",
		"Follow packages/repopo/package.json as an example.",
		"Preserve required tasks and caching settings during migration.",
	].join("\n"),
}];
```

Keep repository-specific decisions in custom policies. Use existing linters for rules they support. Reserve auto-fixes for changes that preserve behavior without an architectural decision.

## FluidFramework handler adapter

If you're migrating from FluidFramework's build-tools, or want to reuse existing Fluid policy handlers, `fromFluidHandlers` converts them to repopo file policies:

```ts title="repopo.config.ts"
import { fromFluidHandlers, makePolicy, type RepopoConfig } from "repopo/api";
import { copyrightFileHeaderHandlers, fluidCaseHandler } from "@fluidframework/build-tools";

// Convert multiple handlers with a namespace prefix
const FluidCopyrightPolicies = fromFluidHandlers(copyrightFileHeaderHandlers, {
	namePrefix: "Fluid:", // Results in "Fluid:my-handler-name"
});

// For a single handler, wrap it in an array
const [FluidCasePolicy] = fromFluidHandlers([fluidCaseHandler]);

export default {
	policies: [
		...FluidCopyrightPolicies.map((definition) => makePolicy(definition)),
		makePolicy(FluidCasePolicy),
	],
} satisfies RepopoConfig;
```

The adapter accepts handlers that match FluidFramework's `Handler` interface:

```ts
interface FluidHandler {
	name: string;
	match: RegExp;
	// Returns undefined to pass, or an error message
	handler: (file: string, root: string) => Promise<string | undefined>;
	// Optional fixer
	resolver?: (file: string, root: string) =>
		| Promise<{ resolved: boolean; message?: string }>
		| { resolved: boolean; message?: string };
}
```

| Aspect | FluidFramework | repopo |
| --- | --- | --- |
| File paths | Absolute | Repo-relative |
| Handler result | `string \| undefined` | Array of findings |
| Fix result | `{ resolved, message? }` | Findings with `fixStatus` |

`FluidAdapterOptions` has one option, `namePrefix`, which is prepended to each policy name.

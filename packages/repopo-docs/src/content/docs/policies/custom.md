---
title: Custom policies
description: A guide to creating your own policies and integrating existing handlers.
sidebar:
  order: 3
---

## Creating Custom Policies

Custom policies can be created using the `Policy` class or policy generator functions. Documentation for creating policies from scratch is coming soon.

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

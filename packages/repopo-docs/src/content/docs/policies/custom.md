---
title: Custom policies
description: A guide to creating your own policies and integrating existing handlers.
sidebar:
  order: 3
---

## Creating Custom Policies

Custom policies can be created using the `Policy` class or policy generator functions. Documentation for creating policies from scratch is coming soon.

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

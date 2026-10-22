---
editUrl: false
next: false
prev: false
title: "fromFluidHandlers"
---

> **fromFluidHandlers**(`fluidHandlers`, `options?`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`void`\>[]

Defined in: [adapters/fluidFramework.ts:178](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/adapters/fluidFramework.ts#L178)

Converts FluidFramework handlers to repopo PolicyDefinitions.

This adapter bridges the gap between FluidFramework's build-tools policy system
and repopo's policy system, allowing you to reuse existing Fluid policies in repopo.

## Parameters

### fluidHandlers

[`FluidHandler`](/api/index/interfaces/fluidhandler/)[]

An array of FluidFramework Handler objects to convert.

### options?

[`FluidAdapterOptions`](/api/index/interfaces/fluidadapteroptions/)

Optional configuration applied to all conversions.

## Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`void`\>[]

An array of repopo PolicyDefinitions.

## Remarks

Key differences handled by this adapter:

- **Handler signature**: Fluid uses `(file, root) => string | undefined`,
  repopo uses `(args) => Promise<PolicyResult> | Operation<PolicyResult>`

- **File paths**: Fluid passes absolute paths, repopo passes repo-relative paths.
  The adapter converts between the two.

- **Return types**: Fluid returns `string | undefined` (error message or success),
  repopo returns `readonly PolicyFinding[]`

For a single handler, wrap it in an array: `fromFluidHandlers([handler])`.

## Example

```typescript
import { fromFluidHandlers, makePolicy } from "repopo";
import { copyrightFileHeaderHandlers, fluidCaseHandler } from "@fluidframework/build-tools";

// Convert multiple handlers with a namespace prefix
const FluidCopyrightPolicies = fromFluidHandlers(copyrightFileHeaderHandlers, {
  namePrefix: "Fluid:",
});

// For a single handler, wrap it in an array
const [FluidCasePolicy] = fromFluidHandlers([fluidCaseHandler]);

const config: RepopoConfig = {
  policies: [
    ...FluidCopyrightPolicies.map(p => makePolicy(p)),
    makePolicy(FluidCasePolicy),
  ],
};
```

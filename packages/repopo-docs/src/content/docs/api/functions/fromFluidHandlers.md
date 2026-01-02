---
editUrl: false
next: false
prev: false
title: "fromFluidHandlers"
---

> **fromFluidHandlers**(`fluidHandlers`, `options?`): [`PolicyDefinition`](/api/interfaces/policydefinition/)\<`undefined`\>[]

Defined in: [adapters/fluidFramework.ts:201](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/adapters/fluidFramework.ts#L201)

Converts an array of FluidFramework handlers to repopo PolicyDefinitions.

This is a convenience function for converting multiple handlers at once.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Parameters

### fluidHandlers

[`FluidHandler`](/api/interfaces/fluidhandler/)[]

An array of FluidFramework Handler objects to convert.

### options?

[`FluidAdapterOptions`](/api/interfaces/fluidadapteroptions/)

Optional configuration applied to all conversions.

## Returns

[`PolicyDefinition`](/api/interfaces/policydefinition/)\<`undefined`\>[]

An array of repopo PolicyDefinitions.

## Example

```typescript
import { fromFluidHandlers, makePolicy } from "repopo";
import { copyrightFileHeaderHandlers } from "@fluidframework/build-tools";

const FluidCopyrightPolicies = fromFluidHandlers(copyrightFileHeaderHandlers, {
  namePrefix: "Fluid:",
});

const config: RepopoConfig = {
  policies: FluidCopyrightPolicies.map(p => makePolicy(p)),
};
```

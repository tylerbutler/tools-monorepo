---
editUrl: false
next: false
prev: false
title: "fromFluidHandler"
---

> **fromFluidHandler**(`fluidHandler`, `options?`): [`PolicyDefinition`](/api/interfaces/policydefinition/)

Defined in: [adapters/fluidFramework.ts:103](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/adapters/fluidFramework.ts#L103)

Converts a FluidFramework handler to a repopo PolicyDefinition.

This adapter bridges the gap between FluidFramework's build-tools policy system
and repopo's policy system, allowing you to reuse existing Fluid policies in repopo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Parameters

### fluidHandler

[`FluidHandler`](/api/interfaces/fluidhandler/)

A FluidFramework Handler object to convert.

### options?

[`FluidAdapterOptions`](/api/interfaces/fluidadapteroptions/)

Optional configuration for the conversion.

## Returns

[`PolicyDefinition`](/api/interfaces/policydefinition/)

A repopo PolicyDefinition that wraps the Fluid handler.

## Remarks

Key differences handled by this adapter:

- **Handler signature**: Fluid uses `(file, root) => string | undefined`,
  repopo uses `(args) => PolicyHandlerResult`

- **File paths**: Fluid passes absolute paths, repopo passes repo-relative paths.
  The adapter converts between the two.

- **Return types**: Fluid returns `string | undefined` (error message or success),
  repopo returns `true | PolicyFailure | PolicyFixResult`

## Example

```typescript
import { fromFluidHandler, makePolicy } from "repopo";
import { fluidCaseHandler } from "@fluidframework/build-tools";

const FluidCasePolicy = fromFluidHandler(fluidCaseHandler);

const config: RepopoConfig = {
  policies: [makePolicy(FluidCasePolicy)],
};
```

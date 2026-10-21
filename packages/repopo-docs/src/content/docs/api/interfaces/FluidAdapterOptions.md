---
editUrl: false
next: false
prev: false
title: "FluidAdapterOptions"
---

Defined in: [adapters/fluidFramework.ts:67](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/adapters/fluidFramework.ts#L67)

Options for converting FluidFramework handlers to repopo policies.

## Properties

### namePrefix?

> `optional` **namePrefix?**: `string`

Defined in: [adapters/fluidFramework.ts:73](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/adapters/fluidFramework.ts#L73)

Optional prefix to add to policy names. Useful for namespacing Fluid policies.

#### Example

```ts
"Fluid:" would result in "Fluid:my-handler-name"
```

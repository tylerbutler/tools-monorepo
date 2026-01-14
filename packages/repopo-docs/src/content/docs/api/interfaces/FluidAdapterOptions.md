---
editUrl: false
next: false
prev: false
title: "FluidAdapterOptions"
---

Defined in: [adapters/fluidFramework.ts:57](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/adapters/fluidFramework.ts#L57)

Options for converting FluidFramework handlers to repopo policies.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### namePrefix?

> `optional` **namePrefix**: `string`

Defined in: [adapters/fluidFramework.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/adapters/fluidFramework.ts#L63)

Optional prefix to add to policy names. Useful for namespacing Fluid policies.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Example

```ts
"Fluid:" would result in "Fluid:my-handler-name"
```

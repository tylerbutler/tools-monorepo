---
editUrl: false
next: false
prev: false
title: "PolicyFunctionArguments"
---

Defined in: [policy.ts:19](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L19)

Arguments passed to policy functions.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C`

## Properties

### config?

> `optional` **config**: `C`

Defined in: [policy.ts:40](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L40)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Remarks

Note that the handler function receives the config as an argument.

***

### file

> **file**: `string`

Defined in: [policy.ts:23](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L23)

Path to the file, relative to the repo root.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolve

> **resolve**: `boolean`

Defined in: [policy.ts:33](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L33)

If true, the handler should resolve any violations automatically if possible.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### root

> **root**: `string`

Defined in: [policy.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L28)

Absolute path to the root of the repo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

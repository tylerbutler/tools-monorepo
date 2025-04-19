---
editUrl: false
next: false
prev: false
title: "PolicyFunctionArguments"
---

Defined in: [policy.ts:25](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L25)

Arguments passed to policy functions.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **C**

## Properties

### config?

> `optional` **config**: `C`

Defined in: [policy.ts:46](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L46)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Remarks

Note that the handler function receives the config as an argument.

***

### file

> **file**: `string`

Defined in: [policy.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L29)

Path to the file, relative to the repo root.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolve

> **resolve**: `boolean`

Defined in: [policy.ts:39](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L39)

If true, the handler should resolve any violations automatically if possible.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### root

> **root**: `string`

Defined in: [policy.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L34)

Absolute path to the root of the repo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

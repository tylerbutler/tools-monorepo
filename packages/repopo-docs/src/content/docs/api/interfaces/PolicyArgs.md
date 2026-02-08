---
editUrl: false
next: false
prev: false
title: "PolicyArgs"
---

Defined in: [policy.ts:18](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L18)

Arguments passed to policy handler functions.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `void`

## Properties

### config?

> `optional` **config**: `C`

Defined in: [policy.ts:37](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L37)

Optional configuration for the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### file

> **file**: `string`

Defined in: [policy.ts:22](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L22)

Path to the file, relative to the repo root.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolve

> **resolve**: `boolean`

Defined in: [policy.ts:32](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L32)

If true, the handler should resolve any violations automatically if possible.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### root

> **root**: `string`

Defined in: [policy.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L27)

Absolute path to the root of the repo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

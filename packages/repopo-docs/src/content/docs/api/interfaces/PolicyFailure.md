---
editUrl: false
next: false
prev: false
title: "PolicyFailure"
---

Defined in: [policy.ts:127](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L127)

A policy failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extended by

- [`PolicyFixResult`](/api/interfaces/policyfixresult/)

## Properties

### autoFixable?

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:141](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L141)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### errorMessage?

> `optional` **errorMessage**: `string`

Defined in: [policy.ts:146](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L146)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### file

> **file**: `string`

Defined in: [policy.ts:136](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L136)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### name

> **name**: `string`

Defined in: [policy.ts:131](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L131)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

---
editUrl: false
next: false
prev: false
title: "PolicyFailure"
---

Defined in: [policy.ts:143](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L143)

A policy failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extended by

- [`PolicyFixResult`](/api/interfaces/policyfixresult/)

## Properties

### autoFixable?

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:157](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L157)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### errorMessages

> **errorMessages**: `string`[]

Defined in: [policy.ts:162](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L162)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### file

> **file**: `string`

Defined in: [policy.ts:152](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L152)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### manualFix?

> `optional` **manualFix**: `string`

Defined in: [policy.ts:167](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L167)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### name

> **name**: `string`

Defined in: [policy.ts:147](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L147)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

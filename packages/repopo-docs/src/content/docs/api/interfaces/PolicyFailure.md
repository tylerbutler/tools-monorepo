---
editUrl: false
next: false
prev: false
title: "PolicyFailure"
---

Defined in: [policy.ts:97](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L97)

A policy failure (legacy format).

## Remarks

New policies should use [PolicyError](/api/interfaces/policyerror/) instead, which has a simpler API.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extended by

- [`PolicyFixResult`](/api/interfaces/policyfixresult/)

## Properties

### autoFixable?

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:111](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L111)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### errorMessages

> **errorMessages**: `string`[]

Defined in: [policy.ts:116](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L116)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### file

> **file**: `string`

Defined in: [policy.ts:106](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L106)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### manualFix?

> `optional` **manualFix**: `string`

Defined in: [policy.ts:121](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L121)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### name

> **name**: `string`

Defined in: [policy.ts:101](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L101)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

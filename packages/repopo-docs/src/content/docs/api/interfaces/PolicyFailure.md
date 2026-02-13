---
editUrl: false
next: false
prev: false
title: "PolicyFailure"
---

Defined in: [policy.ts:96](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L96)

A policy failure (legacy format).

:::caution[Deprecated]
Use [PolicyError](/api/interfaces/policyerror/) instead, which has a simpler API.
:::

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extended by

- [`PolicyFixResult`](/api/interfaces/policyfixresult/)

## Properties

### ~~autoFixable?~~

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:110](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L110)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~errorMessages~~

> **errorMessages**: `string`[]

Defined in: [policy.ts:115](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L115)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~file~~

> **file**: `string`

Defined in: [policy.ts:105](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L105)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~manualFix?~~

> `optional` **manualFix**: `string`

Defined in: [policy.ts:120](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L120)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~name~~

> **name**: `string`

Defined in: [policy.ts:100](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L100)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

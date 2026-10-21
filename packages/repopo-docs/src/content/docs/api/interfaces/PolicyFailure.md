---
editUrl: false
next: false
prev: false
title: "PolicyFailure"
---

Defined in: [policy.ts:147](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L147)

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

> `optional` **autoFixable?**: `boolean`

Defined in: [policy.ts:161](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L161)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~errorMessages~~

> **errorMessages**: `string`[]

Defined in: [policy.ts:166](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L166)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~file~~

> **file**: `string`

Defined in: [policy.ts:156](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L156)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~manualFix?~~

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:171](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L171)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~name~~

> **name**: `string`

Defined in: [policy.ts:151](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L151)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

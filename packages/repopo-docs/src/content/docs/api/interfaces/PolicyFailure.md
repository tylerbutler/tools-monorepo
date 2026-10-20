---
editUrl: false
next: false
prev: false
title: "PolicyFailure"
---

Defined in: [policy.ts:103](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L103)

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

Defined in: [policy.ts:117](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L117)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~errorMessages~~

> **errorMessages**: `string`[]

Defined in: [policy.ts:122](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L122)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~file~~

> **file**: `string`

Defined in: [policy.ts:112](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L112)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~manualFix?~~

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:127](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L127)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### ~~name~~

> **name**: `string`

Defined in: [policy.ts:107](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L107)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

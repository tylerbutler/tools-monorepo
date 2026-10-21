---
editUrl: false
next: false
prev: false
title: "PolicyFailure"
---

Defined in: [policy.ts:167](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L167)

A policy failure (legacy format).

:::caution[Deprecated]
Use [PolicyError](/api/interfaces/policyerror/) instead, which has a simpler API.
:::

## Extended by

- [`PolicyFixResult`](/api/interfaces/policyfixresult/)

## Properties

### ~~autoFixable?~~

> `optional` **autoFixable?**: `boolean`

Defined in: [policy.ts:181](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L181)

Set to `true` if the policy can be fixed automatically.

***

### ~~errorMessages~~

> **errorMessages**: `string`[]

Defined in: [policy.ts:186](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L186)

An optional error message accompanying the failure.

***

### ~~file~~

> **file**: `string`

Defined in: [policy.ts:176](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L176)

Path to the file that failed the policy.

***

### ~~manualFix?~~

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:191](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L191)

An optional string that tells the user how to fix the failure(s).

***

### ~~name~~

> **name**: `string`

Defined in: [policy.ts:171](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L171)

Name of the policy that failed.

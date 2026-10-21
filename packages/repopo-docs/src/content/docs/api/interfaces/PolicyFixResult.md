---
editUrl: false
next: false
prev: false
title: "PolicyFixResult"
---

Defined in: [policy.ts:201](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L201)

The result of an automatic fix for a failing policy (legacy format).

:::caution[Deprecated]
Use [PolicyError](/api/interfaces/policyerror/) with `fixed: boolean` instead.
:::

## Extends

- [`PolicyFailure`](/api/interfaces/policyfailure/)

## Properties

### ~~autoFixable?~~

> `optional` **autoFixable?**: `boolean`

Defined in: [policy.ts:181](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L181)

Set to `true` if the policy can be fixed automatically.

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`autoFixable`](/api/interfaces/policyfailure/#autofixable)

***

### ~~errorMessages~~

> **errorMessages**: `string`[]

Defined in: [policy.ts:186](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L186)

An optional error message accompanying the failure.

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`errorMessages`](/api/interfaces/policyfailure/#errormessages)

***

### ~~file~~

> **file**: `string`

Defined in: [policy.ts:176](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L176)

Path to the file that failed the policy.

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`file`](/api/interfaces/policyfailure/#file)

***

### ~~manualFix?~~

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:191](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L191)

An optional string that tells the user how to fix the failure(s).

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`manualFix`](/api/interfaces/policyfailure/#manualfix)

***

### ~~name~~

> **name**: `string`

Defined in: [policy.ts:171](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L171)

Name of the policy that failed.

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`name`](/api/interfaces/policyfailure/#name)

***

### ~~resolved~~

> **resolved**: `boolean`

Defined in: [policy.ts:205](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L205)

Set to true if the failure was resolved by the automated fixer.

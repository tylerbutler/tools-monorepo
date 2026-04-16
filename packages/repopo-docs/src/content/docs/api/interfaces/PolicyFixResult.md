---
editUrl: false
next: false
prev: false
title: "PolicyFixResult"
---

Defined in: [policy.ts:130](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L130)

The result of an automatic fix for a failing policy (legacy format).

:::caution[Deprecated]
Use [PolicyError](/api/interfaces/policyerror/) with `fixed: boolean` instead.
:::

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`PolicyFailure`](/api/interfaces/policyfailure/)

## Properties

### ~~autoFixable?~~

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:110](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L110)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`autoFixable`](/api/interfaces/policyfailure/#autofixable)

***

### ~~errorMessages~~

> **errorMessages**: `string`[]

Defined in: [policy.ts:115](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L115)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`errorMessages`](/api/interfaces/policyfailure/#errormessages)

***

### ~~file~~

> **file**: `string`

Defined in: [policy.ts:105](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L105)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`file`](/api/interfaces/policyfailure/#file)

***

### ~~manualFix?~~

> `optional` **manualFix**: `string`

Defined in: [policy.ts:120](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L120)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`manualFix`](/api/interfaces/policyfailure/#manualfix)

***

### ~~name~~

> **name**: `string`

Defined in: [policy.ts:100](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L100)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`name`](/api/interfaces/policyfailure/#name)

***

### ~~resolved~~

> **resolved**: `boolean`

Defined in: [policy.ts:134](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L134)

Set to true if the failure was resolved by the automated fixer.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

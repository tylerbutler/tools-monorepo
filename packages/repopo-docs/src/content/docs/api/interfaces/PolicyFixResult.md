---
editUrl: false
next: false
prev: false
title: "PolicyFixResult"
---

Defined in: [policy.ts:175](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L175)

The result of an automatic fix for a failing policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`PolicyFailure`](/api/interfaces/policyfailure/)

## Properties

### autoFixable?

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:157](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L157)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`autoFixable`](/api/interfaces/policyfailure/#autofixable)

***

### errorMessages

> **errorMessages**: `string`[]

Defined in: [policy.ts:162](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L162)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`errorMessages`](/api/interfaces/policyfailure/#errormessages)

***

### file

> **file**: `string`

Defined in: [policy.ts:152](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L152)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`file`](/api/interfaces/policyfailure/#file)

***

### manualFix?

> `optional` **manualFix**: `string`

Defined in: [policy.ts:167](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L167)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`manualFix`](/api/interfaces/policyfailure/#manualfix)

***

### name

> **name**: `string`

Defined in: [policy.ts:147](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L147)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`name`](/api/interfaces/policyfailure/#name)

***

### resolved

> **resolved**: `boolean`

Defined in: [policy.ts:179](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L179)

Set to true if the failure was resolved by the automated fixer.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

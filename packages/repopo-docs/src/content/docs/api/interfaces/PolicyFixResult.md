---
editUrl: false
next: false
prev: false
title: "PolicyFixResult"
---

Defined in: [policy.ts:195](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L195)

The result of an automatic fix for a failing policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`PolicyFailure`](/api/interfaces/policyfailure/)

## Properties

### autoFixable?

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:177](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L177)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`autoFixable`](/api/interfaces/policyfailure/#autofixable)

***

### errorMessages

> **errorMessages**: `string`[]

Defined in: [policy.ts:182](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L182)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`errorMessages`](/api/interfaces/policyfailure/#errormessages)

***

### file

> **file**: `string`

Defined in: [policy.ts:172](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L172)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`file`](/api/interfaces/policyfailure/#file)

***

### manualFix?

> `optional` **manualFix**: `string`

Defined in: [policy.ts:187](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L187)

An optional string that tells the user how to fix the failure(s).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`manualFix`](/api/interfaces/policyfailure/#manualfix)

***

### name

> **name**: `string`

Defined in: [policy.ts:167](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L167)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`name`](/api/interfaces/policyfailure/#name)

***

### resolved

> **resolved**: `boolean`

Defined in: [policy.ts:199](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L199)

Set to true if the failure was resolved by the automated fixer.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

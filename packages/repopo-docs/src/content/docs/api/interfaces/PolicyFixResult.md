---
editUrl: false
next: false
prev: false
title: "PolicyFixResult"
---

Defined in: [policy.ts:172](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L172)

The result of an automatic fix for a failing policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`PolicyFailure`](/api/interfaces/policyfailure/)

## Properties

### autoFixable?

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:159](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L159)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`autoFixable`](/api/interfaces/policyfailure/#autofixable)

***

### errorMessage?

> `optional` **errorMessage**: `string`

Defined in: [policy.ts:164](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L164)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`errorMessage`](/api/interfaces/policyfailure/#errormessage)

***

### file

> **file**: `string`

Defined in: [policy.ts:154](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L154)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`file`](/api/interfaces/policyfailure/#file)

***

### name

> **name**: `string`

Defined in: [policy.ts:149](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L149)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`name`](/api/interfaces/policyfailure/#name)

***

### resolved

> **resolved**: `boolean`

Defined in: [policy.ts:176](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L176)

Set to true if the failure was resolved by the automated fixer.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

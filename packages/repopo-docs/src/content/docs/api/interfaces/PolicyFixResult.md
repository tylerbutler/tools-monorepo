---
editUrl: false
next: false
prev: false
title: "PolicyFixResult"
---

Defined in: [policy.ts:155](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L155)

The result of an automatic fix for a failing policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`PolicyFailure`](/api/interfaces/policyfailure/)

## Properties

### autoFixable?

> `optional` **autoFixable**: `boolean`

Defined in: [policy.ts:142](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L142)

Set to `true` if the policy can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`autoFixable`](/api/interfaces/policyfailure/#autofixable)

***

### errorMessage?

> `optional` **errorMessage**: `string`

Defined in: [policy.ts:147](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L147)

An optional error message accompanying the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`errorMessage`](/api/interfaces/policyfailure/#errormessage)

***

### file

> **file**: `string`

Defined in: [policy.ts:137](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L137)

Path to the file that failed the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`file`](/api/interfaces/policyfailure/#file)

***

### name

> **name**: `string`

Defined in: [policy.ts:132](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L132)

Name of the policy that failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyFailure`](/api/interfaces/policyfailure/).[`name`](/api/interfaces/policyfailure/#name)

***

### resolved

> **resolved**: `boolean`

Defined in: [policy.ts:159](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L159)

Set to true if the failure was resolved by the automated fixer.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

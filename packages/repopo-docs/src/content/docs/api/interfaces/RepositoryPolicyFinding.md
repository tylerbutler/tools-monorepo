---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyFinding"
---

Defined in: [policy.ts:96](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L96)

A repository violation, optionally associated with several repo-relative files.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`PolicyError`](/api/interfaces/policyerror/)

## Properties

### error

> **error**: `string`

Defined in: [policy.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L66)

The error message describing what failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`error`](/api/interfaces/policyerror/#error)

***

### files?

> `optional` **files?**: readonly `string`[]

Defined in: [policy.ts:97](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L97)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### fixable?

> `optional` **fixable?**: `boolean`

Defined in: [policy.ts:71](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L71)

Set to `true` if the policy violation can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`fixable`](/api/interfaces/policyerror/#fixable)

***

### fixed?

> `optional` **fixed?**: `boolean`

Defined in: [policy.ts:76](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L76)

Set to `true` if the violation was successfully fixed (only set when resolve=true).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`fixed`](/api/interfaces/policyerror/#fixed)

***

### manualFix?

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L81)

An optional string that tells the user how to manually fix the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`manualFix`](/api/interfaces/policyerror/#manualfix)

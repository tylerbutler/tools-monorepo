---
editUrl: false
next: false
prev: false
title: "PolicyError"
---

Defined in: [policy.ts:62](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L62)

A policy error returned when a file fails a policy check.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### error

> **error**: `string`

Defined in: [policy.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L66)

The error message describing what failed.

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

***

### fixed?

> `optional` **fixed?**: `boolean`

Defined in: [policy.ts:76](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L76)

Set to `true` if the violation was successfully fixed (only set when resolve=true).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### manualFix?

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L81)

An optional string that tells the user how to manually fix the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

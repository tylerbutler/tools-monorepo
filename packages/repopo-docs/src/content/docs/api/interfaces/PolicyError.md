---
editUrl: false
next: false
prev: false
title: "PolicyError"
---

Defined in: [policy.ts:55](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L55)

A policy error returned when a file fails a policy check.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### error

> **error**: `string`

Defined in: [policy.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L59)

The error message describing what failed.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### fixable?

> `optional` **fixable**: `boolean`

Defined in: [policy.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L64)

Set to `true` if the policy violation can be fixed automatically.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### fixed?

> `optional` **fixed**: `boolean`

Defined in: [policy.ts:69](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L69)

Set to `true` if the violation was successfully fixed (only set when resolve=true).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### manualFix?

> `optional` **manualFix**: `string`

Defined in: [policy.ts:74](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L74)

An optional string that tells the user how to manually fix the failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

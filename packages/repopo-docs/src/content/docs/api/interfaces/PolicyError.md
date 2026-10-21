---
editUrl: false
next: false
prev: false
title: "PolicyError"
---

Defined in: [policy.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L64)

A policy error returned when a file fails a policy check.

## Extended by

- [`RepositoryPolicyFinding`](/api/interfaces/repositorypolicyfinding/)

## Properties

### error

> **error**: `string`

Defined in: [policy.ts:68](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L68)

The error message describing what failed.

***

### fixable?

> `optional` **fixable?**: `boolean`

Defined in: [policy.ts:73](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L73)

Set to `true` if the policy violation can be fixed automatically.

***

### fixed?

> `optional` **fixed?**: `boolean`

Defined in: [policy.ts:78](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L78)

Set to `true` if the violation was successfully fixed (only set when resolve=true).

***

### manualFix?

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:83](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L83)

An optional string that tells the user how to manually fix the failure.

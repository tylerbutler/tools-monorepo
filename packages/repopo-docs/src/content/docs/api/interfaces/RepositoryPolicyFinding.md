---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyFinding"
---

Defined in: [policy.ts:98](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L98)

A repository violation, optionally associated with several repo-relative files.

## Extends

- [`PolicyError`](/api/interfaces/policyerror/)

## Properties

### error

> **error**: `string`

Defined in: [policy.ts:68](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L68)

The error message describing what failed.

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`error`](/api/interfaces/policyerror/#error)

***

### files?

> `optional` **files?**: readonly `string`[]

Defined in: [policy.ts:100](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L100)

Repo-relative paths involved in the violation; omit for a repository-wide issue.

***

### fixable?

> `optional` **fixable?**: `boolean`

Defined in: [policy.ts:73](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L73)

Set to `true` if the policy violation can be fixed automatically.

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`fixable`](/api/interfaces/policyerror/#fixable)

***

### fixed?

> `optional` **fixed?**: `boolean`

Defined in: [policy.ts:78](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L78)

Set to `true` if the violation was successfully fixed (only set when resolve=true).

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`fixed`](/api/interfaces/policyerror/#fixed)

***

### manualFix?

> `optional` **manualFix?**: `string`

Defined in: [policy.ts:83](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L83)

An optional string that tells the user how to manually fix the failure.

#### Inherited from

[`PolicyError`](/api/interfaces/policyerror/).[`manualFix`](/api/interfaces/policyerror/#manualfix)

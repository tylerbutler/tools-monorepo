---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyDefinition"
---

Defined in: [policy.ts:134](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L134)

A policy executed once per invocation, even when the inventory is empty.
Fixes are performed in the handler using `resolve`.

## Type Parameters

### C

`C` = `void`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:144](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L144)

Configuration used when no instance configuration is supplied.

***

### description

> **description**: `string`

Defined in: [policy.ts:138](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L138)

Description of the policy's purpose.

***

### handler

> **handler**: [`RepositoryPolicyHandler`](/api/type-aliases/repositorypolicyhandler/)\<`C`\>

Defined in: [policy.ts:142](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L142)

Checks the repository and applies fixes when `resolve` is true.

***

### name

> **name**: `string`

Defined in: [policy.ts:136](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L136)

Policy name used for display and configuration.

***

### scope

> **scope**: `"repository"`

Defined in: [policy.ts:140](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L140)

Selects repository-wide execution instead of per-file matching.

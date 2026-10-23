---
editUrl: false
next: false
prev: false
title: "DefineGleamPolicyArgs"
---

Defined in: [policyDefiners/defineGleamPolicy.ts:53](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L53)

Input arguments for defining a gleam.toml policy.

## Type Parameters

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policyDefiners/defineGleamPolicy.ts:72](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L72)

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: [policyDefiners/defineGleamPolicy.ts:62](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L62)

A description of the policy's purpose.

***

### handler

> **handler**: [`GleamTomlHandler`](/api/index/type-aliases/gleamtomlhandler/)\<`C`\>

Defined in: [policyDefiners/defineGleamPolicy.ts:67](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L67)

The handler function that receives the parsed gleam.toml and policy arguments.

***

### name

> **name**: `string`

Defined in: [policyDefiners/defineGleamPolicy.ts:57](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L57)

The name of the policy.

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: [policyDefiners/defineGleamPolicy.ts:73](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L73)

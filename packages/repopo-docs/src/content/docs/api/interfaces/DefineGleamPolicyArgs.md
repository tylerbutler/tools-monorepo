---
editUrl: false
next: false
prev: false
title: "DefineGleamPolicyArgs"
---

Defined in: [policyDefiners/defineGleamPolicy.ts:50](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L50)

Input arguments for defining a gleam.toml policy.

## Type Parameters

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policyDefiners/defineGleamPolicy.ts:69](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L69)

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: [policyDefiners/defineGleamPolicy.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L59)

A description of the policy's purpose.

***

### handler

> **handler**: [`GleamTomlHandler`](/api/type-aliases/gleamtomlhandler/)\<`C`\>

Defined in: [policyDefiners/defineGleamPolicy.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L64)

The handler function that receives the parsed gleam.toml and policy arguments.

***

### name

> **name**: `string`

Defined in: [policyDefiners/defineGleamPolicy.ts:54](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L54)

The name of the policy.

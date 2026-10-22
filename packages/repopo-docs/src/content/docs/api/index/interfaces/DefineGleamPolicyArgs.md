---
editUrl: false
next: false
prev: false
title: "DefineGleamPolicyArgs"
---

Defined in: policyDefiners/defineGleamPolicy.ts:52

Input arguments for defining a gleam.toml policy.

## Type Parameters

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: policyDefiners/defineGleamPolicy.ts:71

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: policyDefiners/defineGleamPolicy.ts:61

A description of the policy's purpose.

***

### handler

> **handler**: [`GleamTomlHandler`](/api/index/type-aliases/gleamtomlhandler/)\<`C`\>

Defined in: policyDefiners/defineGleamPolicy.ts:66

The handler function that receives the parsed gleam.toml and policy arguments.

***

### name

> **name**: `string`

Defined in: policyDefiners/defineGleamPolicy.ts:56

The name of the policy.

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: policyDefiners/defineGleamPolicy.ts:72

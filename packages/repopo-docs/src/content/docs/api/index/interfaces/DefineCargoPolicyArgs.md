---
editUrl: false
next: false
prev: false
title: "DefineCargoPolicyArgs"
---

Defined in: policyDefiners/defineCargoPolicy.ts:52

Input arguments for defining a Cargo.toml policy.

## Type Parameters

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: policyDefiners/defineCargoPolicy.ts:71

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: policyDefiners/defineCargoPolicy.ts:61

A description of the policy's purpose.

***

### handler

> **handler**: [`CargoTomlHandler`](/api/index/type-aliases/cargotomlhandler/)\<`C`\>

Defined in: policyDefiners/defineCargoPolicy.ts:66

The handler function that receives the parsed Cargo.toml and policy arguments.

***

### name

> **name**: `string`

Defined in: policyDefiners/defineCargoPolicy.ts:56

The name of the policy.

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: policyDefiners/defineCargoPolicy.ts:72

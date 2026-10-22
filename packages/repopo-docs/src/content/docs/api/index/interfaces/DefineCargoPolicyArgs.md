---
editUrl: false
next: false
prev: false
title: "DefineCargoPolicyArgs"
---

Defined in: policyDefiners/defineCargoPolicy.ts:53

Input arguments for defining a Cargo.toml policy.

## Type Parameters

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: policyDefiners/defineCargoPolicy.ts:72

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: policyDefiners/defineCargoPolicy.ts:62

A description of the policy's purpose.

***

### handler

> **handler**: [`CargoTomlHandler`](/api/index/type-aliases/cargotomlhandler/)\<`C`\>

Defined in: policyDefiners/defineCargoPolicy.ts:67

The handler function that receives the parsed Cargo.toml and policy arguments.

***

### name

> **name**: `string`

Defined in: policyDefiners/defineCargoPolicy.ts:57

The name of the policy.

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: policyDefiners/defineCargoPolicy.ts:73

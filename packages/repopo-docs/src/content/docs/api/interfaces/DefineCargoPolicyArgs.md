---
editUrl: false
next: false
prev: false
title: "DefineCargoPolicyArgs"
---

Defined in: [policyDefiners/defineCargoPolicy.ts:50](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineCargoPolicy.ts#L50)

Input arguments for defining a Cargo.toml policy.

## Type Parameters

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policyDefiners/defineCargoPolicy.ts:69](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineCargoPolicy.ts#L69)

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: [policyDefiners/defineCargoPolicy.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineCargoPolicy.ts#L59)

A description of the policy's purpose.

***

### handler

> **handler**: [`CargoTomlHandler`](/api/type-aliases/cargotomlhandler/)\<`C`\>

Defined in: [policyDefiners/defineCargoPolicy.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineCargoPolicy.ts#L64)

The handler function that receives the parsed Cargo.toml and policy arguments.

***

### name

> **name**: `string`

Defined in: [policyDefiners/defineCargoPolicy.ts:54](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineCargoPolicy.ts#L54)

The name of the policy.

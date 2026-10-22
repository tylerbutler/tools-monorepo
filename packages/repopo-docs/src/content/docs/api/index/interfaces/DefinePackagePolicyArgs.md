---
editUrl: false
next: false
prev: false
title: "DefinePackagePolicyArgs"
---

Defined in: policyDefiners/definePackagePolicy.ts:51

Input arguments for defining a package.json policy.

## Type Parameters

### J

`J`

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: policyDefiners/definePackagePolicy.ts:70

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: policyDefiners/definePackagePolicy.ts:60

A description of the policy's purpose.

***

### handler

> **handler**: [`PackageJsonHandler`](/api/index/type-aliases/packagejsonhandler/)\<`J`, `C`\>

Defined in: policyDefiners/definePackagePolicy.ts:65

The handler function that receives the parsed package.json and policy arguments.

***

### name

> **name**: `string`

Defined in: policyDefiners/definePackagePolicy.ts:55

The name of the policy.

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: policyDefiners/definePackagePolicy.ts:71

---
editUrl: false
next: false
prev: false
title: "DefinePackagePolicyArgs"
---

Defined in: [policyDefiners/definePackagePolicy.ts:52](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L52)

Input arguments for defining a package.json policy.

## Type Parameters

### J

`J`

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policyDefiners/definePackagePolicy.ts:71](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L71)

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: [policyDefiners/definePackagePolicy.ts:61](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L61)

A description of the policy's purpose.

***

### handler

> **handler**: [`PackageJsonHandler`](/api/index/type-aliases/packagejsonhandler/)\<`J`, `C`\>

Defined in: [policyDefiners/definePackagePolicy.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L66)

The handler function that receives the parsed package.json and policy arguments.

***

### name

> **name**: `string`

Defined in: [policyDefiners/definePackagePolicy.ts:56](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L56)

The name of the policy.

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: [policyDefiners/definePackagePolicy.ts:72](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L72)

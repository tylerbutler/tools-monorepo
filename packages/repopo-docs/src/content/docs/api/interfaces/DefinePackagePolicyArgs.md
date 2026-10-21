---
editUrl: false
next: false
prev: false
title: "DefinePackagePolicyArgs"
---

Defined in: [policyDefiners/definePackagePolicy.ts:49](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L49)

Input arguments for defining a package.json policy.

## Type Parameters

### J

`J`

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policyDefiners/definePackagePolicy.ts:68](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L68)

Optional default configuration for the policy.

***

### description

> **description**: `string`

Defined in: [policyDefiners/definePackagePolicy.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L58)

A description of the policy's purpose.

***

### handler

> **handler**: [`PackageJsonHandler`](/api/type-aliases/packagejsonhandler/)\<`J`, `C`\>

Defined in: [policyDefiners/definePackagePolicy.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L63)

The handler function that receives the parsed package.json and policy arguments.

***

### name

> **name**: `string`

Defined in: [policyDefiners/definePackagePolicy.ts:53](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L53)

The name of the policy.

---
editUrl: false
next: false
prev: false
title: "PackageJsonHandler"
---

> **PackageJsonHandler**\<`J`, `C`\> = (`json`, `args`) => `Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policyDefiners/definePackagePolicy.ts:18](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L18)

A policy handler especially for policies that target package.json.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### J

`J`

### C

`C`

## Parameters

### json

`J`

### args

[`PolicyFunctionArguments`](/api/interfaces/policyfunctionarguments/)\<`C`\>

## Returns

`Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

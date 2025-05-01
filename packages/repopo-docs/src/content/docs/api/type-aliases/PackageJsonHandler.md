---
editUrl: false
next: false
prev: false
title: "PackageJsonHandler"
---

> **PackageJsonHandler**\<`J`, `C`\> = (`json`, `args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policyGenerators/generatePackagePolicy.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generatePackagePolicy.ts#L17)

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

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

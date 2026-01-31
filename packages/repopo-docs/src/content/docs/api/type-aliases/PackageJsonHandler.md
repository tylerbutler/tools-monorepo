---
editUrl: false
next: false
prev: false
title: "PackageJsonHandler"
---

> **PackageJsonHandler**\<`J`, `C`\> = (`json`, `args`) => `Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policyDefiners/definePackagePolicy.ts:26](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L26)

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

`Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

## Remarks

Package JSON handlers can be implemented in two ways:
- As an async function returning a Promise
- As an Effection generator function returning an Operation

Both styles are supported to allow gradual migration and flexibility.

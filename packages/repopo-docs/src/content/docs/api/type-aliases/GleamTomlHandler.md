---
editUrl: false
next: false
prev: false
title: "GleamTomlHandler"
---

> **GleamTomlHandler**\<`C`\> = (`toml`, `args`) => `Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policyDefiners/defineGleamPolicy.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L27)

A policy handler for gleam.toml policies.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C`

## Parameters

### toml

[`GleamToml`](/api/type-aliases/gleamtoml/)

### args

[`PolicyArgs`](/api/interfaces/policyargs/)\<`C`\>

## Returns

`Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

## Remarks

Receives the parsed TOML content and the standard policy arguments.

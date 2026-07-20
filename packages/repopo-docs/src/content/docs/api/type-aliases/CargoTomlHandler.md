---
editUrl: false
next: false
prev: false
title: "CargoTomlHandler"
---

> **CargoTomlHandler**\<`C`\> = (`toml`, `args`) => `Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policyDefiners/defineCargoPolicy.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineCargoPolicy.ts#L27)

A policy handler for Cargo.toml policies.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C`

## Parameters

### toml

[`CargoToml`](/api/type-aliases/cargotoml/)

### args

[`PolicyArgs`](/api/interfaces/policyargs/)\<`C`\>

## Returns

`Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

## Remarks

Receives the parsed TOML content and the standard policy arguments.

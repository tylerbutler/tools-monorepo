---
editUrl: false
next: false
prev: false
title: "CargoTomlHandler"
---

> **CargoTomlHandler**\<`C`\> = (`toml`, `args`) => `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: policyDefiners/defineCargoPolicy.ts:30

A policy handler for Cargo.toml policies.

## Type Parameters

### C

`C`

## Parameters

### toml

[`CargoToml`](/api/index/type-aliases/cargotoml/)

### args

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`C`\>

## Returns

`Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

## Remarks

Receives the parsed TOML content and the standard policy arguments.

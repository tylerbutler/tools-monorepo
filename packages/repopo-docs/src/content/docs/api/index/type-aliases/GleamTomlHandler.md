---
editUrl: false
next: false
prev: false
title: "GleamTomlHandler"
---

> **GleamTomlHandler**\<`C`\> = (`toml`, `args`) => `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: policyDefiners/defineGleamPolicy.ts:31

A policy handler for gleam.toml policies.

## Type Parameters

### C

`C`

## Parameters

### toml

[`GleamToml`](/api/index/type-aliases/gleamtoml/)

### args

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`C`\>

## Returns

`Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

## Remarks

Receives the parsed TOML content and the standard policy arguments.

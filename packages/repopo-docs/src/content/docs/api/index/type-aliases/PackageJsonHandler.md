---
editUrl: false
next: false
prev: false
title: "PackageJsonHandler"
---

> **PackageJsonHandler**\<`J`, `C`\> = (`json`, `args`) => `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: policyDefiners/definePackagePolicy.ts:29

A policy handler especially for policies that target package.json.

## Type Parameters

### J

`J`

### C

`C`

## Parameters

### json

`J`

### args

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`C`\>

## Returns

`Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

## Remarks

Package JSON handlers can be implemented in two ways:
- As an async function returning a Promise
- As an Effection generator function returning an Operation

Both styles are supported to allow gradual migration and flexibility.

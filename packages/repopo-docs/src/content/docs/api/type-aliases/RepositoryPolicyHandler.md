---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyHandler"
---

> **RepositoryPolicyHandler**\<`C`\> = (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`RepositoryPolicyResult`](/api/type-aliases/repositorypolicyresult/)\> \| `Operation`\<[`RepositoryPolicyResult`](/api/type-aliases/repositorypolicyresult/)\>

Defined in: [policy.ts:125](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L125)

An async function or Effection operation that checks the repository once.

## Type Parameters

### C

`C` = `void`

## Parameters

### args

[`RepositoryPolicyArgs`](/api/interfaces/repositorypolicyargs/)\<`C`\>

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`RepositoryPolicyResult`](/api/type-aliases/repositorypolicyresult/)\> \| `Operation`\<[`RepositoryPolicyResult`](/api/type-aliases/repositorypolicyresult/)\>

---
editUrl: false
next: false
prev: false
title: "PolicyHandler"
---

> **PolicyHandler**\<`C`\> = (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| (`args`) => `Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policy.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L58)

A policy handler function that is called to check policy against a file.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `unknown` \| `undefined`

## Remarks

Policy handlers can be implemented in two ways:
- As an async function returning a Promise
- As an Effection generator function returning an Operation

Both styles are supported to allow gradual migration and flexibility.

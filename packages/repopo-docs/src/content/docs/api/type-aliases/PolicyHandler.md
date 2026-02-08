---
editUrl: false
next: false
prev: false
title: "PolicyHandler"
---

> **PolicyHandler**\<`C`\> = (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\> \| (`args`) => `Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policy.ts:170](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L170)

A policy handler function that checks a file against a policy.

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

Both styles are supported. Async handlers are automatically wrapped for Effection.

Handlers can return either the legacy format ([PolicyFailure](/api/interfaces/policyfailure/)) or
the new format ([PolicyError](/api/interfaces/policyerror/)). The new format is simpler and recommended
for new policies.

---
editUrl: false
next: false
prev: false
title: "PolicyHandlerAsync"
---

> **PolicyHandlerAsync**\<`C`\> = (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policy.ts:61](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L61)

A policy handler async function that is called to check policy against a file.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `unknown` \| `undefined`

## Parameters

### args

[`PolicyFunctionArguments`](/api/interfaces/policyfunctionarguments/)\<`C`\>

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

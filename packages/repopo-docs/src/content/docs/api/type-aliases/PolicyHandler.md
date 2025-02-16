---
editUrl: false
next: false
prev: false
title: "PolicyHandler"
---

> **PolicyHandler**\<`C`\>: (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`true` \| [`PolicyFailure`](/api/interfaces/policyfailure/) \| [`PolicyFixResult`](/api/interfaces/policyfixresult/)\>

Defined in: [policy.ts:57](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L57)

A policy handler is a function that is called to check policy against a file.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **C** = `unknown` \| `undefined`

## Parameters

### args

[`PolicyFunctionArguments`](/api/interfaces/policyfunctionarguments/)\<`C`\>

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`true` \| [`PolicyFailure`](/api/interfaces/policyfailure/) \| [`PolicyFixResult`](/api/interfaces/policyfixresult/)\>

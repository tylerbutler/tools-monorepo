---
editUrl: false
next: false
prev: false
title: "PolicyHandler"
---

> **PolicyHandler**\<`C`\> = (`args`) => `Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

Defined in: [policy.ts:52](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L52)

A policy handler is a function that is called to check policy against a file.

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

`Operation`\<[`PolicyHandlerResult`](/api/type-aliases/policyhandlerresult/)\>

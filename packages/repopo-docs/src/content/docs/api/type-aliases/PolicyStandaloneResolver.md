---
editUrl: false
next: false
prev: false
title: "PolicyStandaloneResolver"
---

> **PolicyStandaloneResolver**\<`C`\> = (`args`) => `Operation`\<[`PolicyFixResult`](/api/interfaces/policyfixresult/)\>

Defined in: [policy.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L59)

A standalone function that can be called to resolve a policy failure.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `undefined`

## Parameters

### args

[`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyFunctionArguments`](/api/interfaces/policyfunctionarguments/)\<`C`\>, `"resolve"`\>

## Returns

`Operation`\<[`PolicyFixResult`](/api/interfaces/policyfixresult/)\>

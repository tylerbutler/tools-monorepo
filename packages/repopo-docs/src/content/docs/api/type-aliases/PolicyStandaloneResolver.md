---
editUrl: false
next: false
prev: false
title: "PolicyStandaloneResolver"
---

> **PolicyStandaloneResolver**\<`C`\> = (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFixResult`](/api/interfaces/policyfixresult/)\> \| `Operation`\<[`PolicyFixResult`](/api/interfaces/policyfixresult/)\>

Defined in: [policy.ts:179](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L179)

A standalone resolver function that can fix policy violations (legacy format).

:::caution[Deprecated]
Use [PolicyResolver](/api/type-aliases/policyresolver/) instead, which uses [PolicyError](/api/interfaces/policyerror/).
:::

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `undefined`

## Parameters

### args

[`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyArgs`](/api/interfaces/policyargs/)\<`C`\>, `"resolve"`\>

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFixResult`](/api/interfaces/policyfixresult/)\> \| `Operation`\<[`PolicyFixResult`](/api/interfaces/policyfixresult/)\>

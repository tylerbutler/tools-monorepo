---
editUrl: false
next: false
prev: false
title: "PolicyResolver"
---

> **PolicyResolver**\<`C`\> = (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyError`](/api/interfaces/policyerror/)\> \| `Operation`\<[`PolicyError`](/api/interfaces/policyerror/)\>

Defined in: [policy.ts:188](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L188)

A standalone resolver function using the new format.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `void`

## Parameters

### args

[`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyArgs`](/api/interfaces/policyargs/)\<`C`\>, `"resolve"`\>

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyError`](/api/interfaces/policyerror/)\> \| `Operation`\<[`PolicyError`](/api/interfaces/policyerror/)\>

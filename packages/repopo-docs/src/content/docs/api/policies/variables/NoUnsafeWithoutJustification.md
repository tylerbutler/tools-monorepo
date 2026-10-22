---
editUrl: false
next: false
prev: false
title: "NoUnsafeWithoutJustification"
---

> `const` **NoUnsafeWithoutJustification**: `object`

Defined in: [policies/NoUnsafeWithoutJustification.ts:72](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/NoUnsafeWithoutJustification.ts#L72)

A policy that requires SAFETY comments on unsafe blocks in Rust source files.

## Type Declaration

### description

> **description**: `string` = `"Requires safety justification comments on unsafe blocks in Rust source files."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`NoUnsafeWithoutJustificationConfig`](/api/index/interfaces/nounsafewithoutjustificationconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"NoUnsafeWithoutJustification"`

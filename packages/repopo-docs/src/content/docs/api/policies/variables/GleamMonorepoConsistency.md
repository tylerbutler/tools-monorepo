---
editUrl: false
next: false
prev: false
title: "GleamMonorepoConsistency"
---

> `const` **GleamMonorepoConsistency**: `object`

Defined in: policies/GleamMonorepoConsistency.ts:73

A policy that enforces consistent metadata across Gleam packages in a monorepo.

## Type Declaration

### description

> **description**: `string` = `"Enforces consistent metadata (licences, gleam version, etc.) across Gleam packages in a monorepo."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`GleamMonorepoConsistencyConfig`](/api/index/interfaces/gleammonorepoconsistencyconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"GleamMonorepoConsistency"`

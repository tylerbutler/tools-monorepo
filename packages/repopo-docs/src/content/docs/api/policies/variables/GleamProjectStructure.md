---
editUrl: false
next: false
prev: false
title: "GleamProjectStructure"
---

> `const` **GleamProjectStructure**: `object`

Defined in: policies/GleamProjectStructure.ts:28

A policy that validates standard Gleam project structure.

## Type Declaration

### description

> **description**: `string` = `"Validates that Gleam projects have the standard directory structure (src/, test/)."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`GleamProjectStructureConfig`](/api/index/interfaces/gleamprojectstructureconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"GleamProjectStructure"`

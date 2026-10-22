---
editUrl: false
next: false
prev: false
title: "WorkspaceMembersValid"
---

> `const` **WorkspaceMembersValid**: `object`

Defined in: policies/WorkspaceMembersValid.ts:75

A policy that validates Cargo workspace member paths exist.

## Type Declaration

### description

> **description**: `string` = `"Validates that all Cargo workspace member paths exist and contain Cargo.toml files."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`WorkspaceMembersValidConfig`](/api/index/interfaces/workspacemembersvalidconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"WorkspaceMembersValid"`

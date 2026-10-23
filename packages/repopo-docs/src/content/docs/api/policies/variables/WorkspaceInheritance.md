---
editUrl: false
next: false
prev: false
title: "WorkspaceInheritance"
---

> `const` **WorkspaceInheritance**: `object`

Defined in: [policies/WorkspaceInheritance.ts:85](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/WorkspaceInheritance.ts#L85)

A policy that ensures Cargo workspace members inherit fields from the workspace config.

## Type Declaration

### description

> **description**: `string` = `"Ensures Cargo workspace members inherit shared fields (version, authors, etc.) from workspace config."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`WorkspaceInheritanceConfig`](/api/index/interfaces/workspaceinheritanceconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"WorkspaceInheritance"`

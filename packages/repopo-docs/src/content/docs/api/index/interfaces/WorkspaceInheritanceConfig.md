---
editUrl: false
next: false
prev: false
title: "WorkspaceInheritanceConfig"
---

Defined in: policies/WorkspaceInheritance.ts:11

Configuration for the WorkspaceInheritance policy.

## Properties

### allowOverrides?

> `optional` **allowOverrides?**: `string`[]

Defined in: policies/WorkspaceInheritance.ts:21

Crate paths that are allowed to override inherited fields.

***

### inherit?

> `optional` **inherit?**: `string`[]

Defined in: policies/WorkspaceInheritance.ts:16

Package fields that should use workspace inheritance.

#### Default Value

```ts
["version", "authors", "license", "repository"]
```

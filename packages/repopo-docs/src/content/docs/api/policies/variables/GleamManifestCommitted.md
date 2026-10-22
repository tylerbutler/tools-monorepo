---
editUrl: false
next: false
prev: false
title: "GleamManifestCommitted"
---

> `const` **GleamManifestCommitted**: `object`

Defined in: policies/GleamManifestCommitted.ts:10

A policy that ensures manifest.toml is committed alongside gleam.toml
for reproducible Gleam builds.

## Type Declaration

### description

> **description**: `string` = `"Ensures manifest.toml is committed alongside gleam.toml for reproducible builds."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`void`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"GleamManifestCommitted"`

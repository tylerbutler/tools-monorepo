---
editUrl: false
next: false
prev: false
title: "GleamSharedDependencyVersions"
---

> `const` **GleamSharedDependencyVersions**: `object`

Defined in: policies/GleamSharedDependencyVersions.ts:92

A policy that detects dependency version mismatches across Gleam packages in a monorepo.

## Type Declaration

### description

> **description**: `string` = `"Detects dependency version mismatches across Gleam packages in a monorepo."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`GleamSharedDependencyVersionsConfig`](/api/index/interfaces/gleamshareddependencyversionsconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"GleamSharedDependencyVersions"`

### requiresConfig

> **requiresConfig**: `true` = `true`

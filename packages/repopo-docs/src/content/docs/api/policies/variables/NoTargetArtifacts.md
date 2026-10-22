---
editUrl: false
next: false
prev: false
title: "NoTargetArtifacts"
---

> `const` **NoTargetArtifacts**: `object`

Defined in: policies/NoTargetArtifacts.ts:28

A policy that prevents accidental commits of Rust build artifacts.

## Type Declaration

### description

> **description**: `string` = `"Prevents accidental commits of Rust build artifacts (.rlib, .rmeta, .so, .dylib, etc.)."`

### handler

> **handler**: (`__namedParameters`) => `Operation`\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`void`\>

#### Returns

`Operation`\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp) = `ARTIFACT_REGEX`

### name

> **name**: `string` = `"NoTargetArtifacts"`

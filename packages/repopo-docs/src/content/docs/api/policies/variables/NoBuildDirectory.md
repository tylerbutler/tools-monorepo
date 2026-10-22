---
editUrl: false
next: false
prev: false
title: "NoBuildDirectory"
---

> `const` **NoBuildDirectory**: `object`

Defined in: policies/NoBuildDirectory.ts:15

A policy that prevents accidental commits of build directory contents.
Applies to Gleam's `build/` output directory.

## Type Declaration

### description

> **description**: `string` = `"Prevents accidental commits of build directory contents (Gleam build/ output)."`

### handler

> **handler**: (`__namedParameters`) => `Operation`\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`void`\>

#### Returns

`Operation`\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp) = `BUILD_DIR_REGEX`

### name

> **name**: `string` = `"NoBuildDirectory"`

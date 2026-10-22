---
editUrl: false
next: false
prev: false
title: "NoLargeBinaryFiles"
---

> `const` **NoLargeBinaryFiles**: `object`

Defined in: policies/NoLargeBinaryFiles.ts:123

A repo policy that prevents large binary files from being committed to the repository.
Large files can bloat the repository and slow down clones. Consider using Git LFS for large assets.

## Type Declaration

### description

> **description**: `string` = `"Prevents large binary files from being committed to avoid repository bloat; consider using Git LFS for large assets."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`NoLargeBinaryFilesSettings`](/api/index/interfaces/nolargebinaryfilessettings/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"NoLargeBinaryFiles"`

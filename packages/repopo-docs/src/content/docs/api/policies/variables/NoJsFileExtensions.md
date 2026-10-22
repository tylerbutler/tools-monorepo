---
editUrl: false
next: false
prev: false
title: "NoJsFileExtensions"
---

> `const` **NoJsFileExtensions**: `object`

Defined in: [policies/NoJsFileExtensions.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/NoJsFileExtensions.ts#L12)

A repo policy that checks for JavaScript source files that just use the .js file extension. Such files may be
interpreted by node as either CommonJS or ESM based on the `type` field in the nearest package.json file. This
can create unexpected behavior for JS files; changing the package.json nearest to one will change how the JS
is processed by node. Using explicit file extensions reduces ambiguity and ensures a CJS file isn't suddenly treated
like an ESM file.

## Type Declaration

### description

> **description**: `string` = `"Prevents ambiguous .js files by requiring explicit .mjs or .cjs extensions based on module format."`

### handler

> **handler**: () => `Operation`\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

#### Returns

`Operation`\<[`PolicyFinding`](/api/index/interfaces/policyfinding/)[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"NoJsFileExtensions"`

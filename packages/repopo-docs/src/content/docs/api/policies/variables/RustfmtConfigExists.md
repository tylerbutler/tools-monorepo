---
editUrl: false
next: false
prev: false
title: "RustfmtConfigExists"
---

> `const` **RustfmtConfigExists**: `object`

Defined in: [policies/RustfmtConfigExists.ts:24](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RustfmtConfigExists.ts#L24)

A policy that requires a rustfmt.toml file for consistent Rust formatting.

## Type Declaration

### description

> **description**: `string` = `"Ensures a rustfmt.toml file exists for consistent Rust formatting."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`RustfmtConfigExistsConfig`](/api/index/interfaces/rustfmtconfigexistsconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"RustfmtConfigExists"`

---
editUrl: false
next: false
prev: false
title: "RustToolchainExists"
---

> `const` **RustToolchainExists**: `object`

Defined in: policies/RustToolchainExists.ts:24

A policy that requires a rust-toolchain.toml file for reproducible Rust builds.

## Type Declaration

### description

> **description**: `string` = `"Ensures a rust-toolchain.toml file exists for reproducible Rust builds."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<[`RustToolchainExistsConfig`](/api/index/interfaces/rusttoolchainexistsconfig/)\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

### name

> **name**: `string` = `"RustToolchainExists"`

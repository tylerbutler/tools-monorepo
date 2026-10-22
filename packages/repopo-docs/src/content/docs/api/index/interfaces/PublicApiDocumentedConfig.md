---
editUrl: false
next: false
prev: false
title: "PublicApiDocumentedConfig"
---

Defined in: policies/PublicApiDocumented.ts:12

Configuration for the PublicApiDocumented policy.

## Properties

### checkCargoLints?

> `optional` **checkCargoLints?**: `boolean`

Defined in: policies/PublicApiDocumented.ts:17

If true, check for `#![deny(missing_docs)]` directive via [lints.rust] in Cargo.toml.

#### Default Value

```ts
true
```

---
editUrl: false
next: false
prev: false
title: "PublicApiDocumentedConfig"
---

Defined in: [policies/PublicApiDocumented.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PublicApiDocumented.ts#L12)

Configuration for the PublicApiDocumented policy.

## Properties

### checkCargoLints?

> `optional` **checkCargoLints?**: `boolean`

Defined in: [policies/PublicApiDocumented.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PublicApiDocumented.ts#L17)

If true, check for `#![deny(missing_docs)]` directive via [lints.rust] in Cargo.toml.

#### Default Value

```ts
true
```

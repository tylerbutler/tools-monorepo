---
editUrl: false
next: false
prev: false
title: "RustDocExistsConfig"
---

Defined in: [policies/RustDocExists.ts:14](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RustDocExists.ts#L14)

Configuration for the RustDocExists policy.

## Properties

### recommended?

> `optional` **recommended?**: `string`[]

Defined in: [policies/RustDocExists.ts:24](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RustDocExists.ts#L24)

Files that are recommended but not required. Missing ones produce warnings.

***

### required?

> `optional` **required?**: `string`[]

Defined in: [policies/RustDocExists.ts:19](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RustDocExists.ts#L19)

Files that must exist alongside the Cargo.toml.

#### Default Value

```ts
["README.md"]
```

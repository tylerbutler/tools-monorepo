---
editUrl: false
next: false
prev: false
title: "GleamDocExistsConfig"
---

Defined in: [policies/GleamDocExists.ts:14](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamDocExists.ts#L14)

Configuration for the GleamDocExists policy.

## Properties

### recommended?

> `optional` **recommended?**: `string`[]

Defined in: [policies/GleamDocExists.ts:24](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamDocExists.ts#L24)

Files that are recommended but not required. Missing ones produce warnings.

***

### required?

> `optional` **required?**: `string`[]

Defined in: [policies/GleamDocExists.ts:19](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamDocExists.ts#L19)

Files that must exist alongside the gleam.toml.

#### Default Value

```ts
["README.md"]
```

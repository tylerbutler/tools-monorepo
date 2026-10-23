---
editUrl: false
next: false
prev: false
title: "CargoTomlRequiredConfig"
---

Defined in: [policies/CargoTomlRequired.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoTomlRequired.ts#L12)

Configuration for the CargoTomlRequired policy.

## Properties

### expectedValues?

> `optional` **expectedValues?**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: [policies/CargoTomlRequired.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoTomlRequired.ts#L34)

Specific field values to enforce. Keys are field names, values are expected values.

***

### minimumEdition?

> `optional` **minimumEdition?**: `string`

Defined in: [policies/CargoTomlRequired.ts:23](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoTomlRequired.ts#L23)

Minimum Rust edition to require (e.g., "2021").
If set, the `edition` field must exist and be at least this value.

***

### required?

> `optional` **required?**: `string`[]

Defined in: [policies/CargoTomlRequired.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoTomlRequired.ts#L17)

Fields that must exist in the [package] section.

#### Default Value

```ts
["license", "description"]
```

***

### requireRustVersion?

> `optional` **requireRustVersion?**: `boolean`

Defined in: [policies/CargoTomlRequired.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoTomlRequired.ts#L29)

If true, require the `rust-version` field (MSRV) to be set.

#### Default Value

```ts
false
```

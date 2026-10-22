---
editUrl: false
next: false
prev: false
title: "CargoTomlRequiredConfig"
---

Defined in: policies/CargoTomlRequired.ts:12

Configuration for the CargoTomlRequired policy.

## Properties

### expectedValues?

> `optional` **expectedValues?**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: policies/CargoTomlRequired.ts:34

Specific field values to enforce. Keys are field names, values are expected values.

***

### minimumEdition?

> `optional` **minimumEdition?**: `string`

Defined in: policies/CargoTomlRequired.ts:23

Minimum Rust edition to require (e.g., "2021").
If set, the `edition` field must exist and be at least this value.

***

### required?

> `optional` **required?**: `string`[]

Defined in: policies/CargoTomlRequired.ts:17

Fields that must exist in the [package] section.

#### Default Value

```ts
["license", "description"]
```

***

### requireRustVersion?

> `optional` **requireRustVersion?**: `boolean`

Defined in: policies/CargoTomlRequired.ts:29

If true, require the `rust-version` field (MSRV) to be set.

#### Default Value

```ts
false
```

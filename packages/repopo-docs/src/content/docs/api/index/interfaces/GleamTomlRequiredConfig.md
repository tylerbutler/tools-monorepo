---
editUrl: false
next: false
prev: false
title: "GleamTomlRequiredConfig"
---

Defined in: policies/GleamTomlRequired.ts:12

Configuration for the GleamTomlRequired policy.

## Properties

### required?

> `optional` **required?**: `string`[]

Defined in: policies/GleamTomlRequired.ts:17

Top-level fields that must exist in gleam.toml.

#### Default Value

```ts
["name", "version"]
```

***

### requireGleamVersion?

> `optional` **requireGleamVersion?**: `boolean`

Defined in: policies/GleamTomlRequired.ts:23

If true, require the `gleam` compiler version constraint.

#### Default Value

```ts
false
```

***

### requireRepository?

> `optional` **requireRepository?**: `boolean`

Defined in: policies/GleamTomlRequired.ts:29

If true, require the `[repository]` section.

#### Default Value

```ts
false
```

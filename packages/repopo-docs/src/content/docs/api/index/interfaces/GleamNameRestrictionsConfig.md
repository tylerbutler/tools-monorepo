---
editUrl: false
next: false
prev: false
title: "GleamNameRestrictionsConfig"
---

Defined in: policies/GleamNameRestrictions.ts:12

Configuration for the GleamNameRestrictions policy.

## Properties

### denyPrefixes?

> `optional` **denyPrefixes?**: `string`[]

Defined in: policies/GleamNameRestrictions.ts:17

Prefixes that are denied for package names.

#### Default Value

```ts
["gleam_"]
```

***

### requireSnakeCase?

> `optional` **requireSnakeCase?**: `boolean`

Defined in: policies/GleamNameRestrictions.ts:23

If true, require snake_case naming.

#### Default Value

```ts
true
```

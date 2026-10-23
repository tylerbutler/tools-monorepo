---
editUrl: false
next: false
prev: false
title: "GleamMonorepoConsistencyConfig"
---

Defined in: [policies/GleamMonorepoConsistency.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamMonorepoConsistency.ts#L11)

Configuration for the GleamMonorepoConsistency policy.

## Properties

### packages?

> `optional` **packages?**: `string`[]

Defined in: [policies/GleamMonorepoConsistency.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamMonorepoConsistency.ts#L28)

Paths to gleam.toml files to compare (relative to repo root).
If not specified, the policy only checks the file it matches against.

***

### syncFields?

> `optional` **syncFields?**: `string`[]

Defined in: [policies/GleamMonorepoConsistency.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamMonorepoConsistency.ts#L16)

Top-level fields that should be consistent across all packages.

#### Default Value

```ts
["licences"]
```

***

### syncGleamVersion?

> `optional` **syncGleamVersion?**: `boolean`

Defined in: [policies/GleamMonorepoConsistency.ts:22](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamMonorepoConsistency.ts#L22)

If true, ensure the `gleam` version constraint is consistent.

#### Default Value

```ts
true
```

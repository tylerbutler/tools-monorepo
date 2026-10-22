---
editUrl: false
next: false
prev: false
title: "GleamSharedDependencyVersionsConfig"
---

Defined in: [policies/GleamSharedDependencyVersions.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamSharedDependencyVersions.ts#L11)

Configuration for the GleamSharedDependencyVersions policy.

## Properties

### detectMismatches?

> `optional` **detectMismatches?**: `boolean`

Defined in: [policies/GleamSharedDependencyVersions.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamSharedDependencyVersions.ts#L16)

If true, detect version mismatches across packages.

#### Default Value

```ts
true
```

***

### includeDev?

> `optional` **includeDev?**: `boolean`

Defined in: [policies/GleamSharedDependencyVersions.ts:22](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamSharedDependencyVersions.ts#L22)

If true, also check dev-dependencies for mismatches.

#### Default Value

```ts
false
```

***

### packages?

> `optional` **packages?**: `string`[]

Defined in: [policies/GleamSharedDependencyVersions.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/GleamSharedDependencyVersions.ts#L27)

Paths to gleam.toml files to compare (relative to repo root).

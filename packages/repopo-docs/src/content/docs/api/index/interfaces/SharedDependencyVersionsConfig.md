---
editUrl: false
next: false
prev: false
title: "SharedDependencyVersionsConfig"
---

Defined in: [policies/SharedDependencyVersions.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/SharedDependencyVersions.ts#L12)

Configuration for the SharedDependencyVersions policy.

## Properties

### detectMismatches?

> `optional` **detectMismatches?**: `boolean`

Defined in: [policies/SharedDependencyVersions.ts:22](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/SharedDependencyVersions.ts#L22)

If true, detect version mismatches across workspace members.

#### Default Value

```ts
true
```

***

### requireWorkspaceDeps?

> `optional` **requireWorkspaceDeps?**: `string`[]

Defined in: [policies/SharedDependencyVersions.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/SharedDependencyVersions.ts#L16)

Dependencies that should use workspace-level versions.

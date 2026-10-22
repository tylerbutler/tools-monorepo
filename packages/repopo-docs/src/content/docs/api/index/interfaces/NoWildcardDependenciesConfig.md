---
editUrl: false
next: false
prev: false
title: "NoWildcardDependenciesConfig"
---

Defined in: [policies/NoWildcardDependencies.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/NoWildcardDependencies.ts#L12)

Configuration for the NoWildcardDependencies policy.

## Properties

### allowDev?

> `optional` **allowDev?**: `boolean`

Defined in: [policies/NoWildcardDependencies.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/NoWildcardDependencies.ts#L29)

If true, dev-dependencies are checked more leniently (only deny, not warn).

#### Default Value

```ts
true
```

***

### deny?

> `optional` **deny?**: `string`[]

Defined in: [policies/NoWildcardDependencies.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/NoWildcardDependencies.ts#L17)

Version patterns to deny outright.

#### Default Value

```ts
["*"]
```

***

### warn?

> `optional` **warn?**: `string`[]

Defined in: [policies/NoWildcardDependencies.ts:23](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/NoWildcardDependencies.ts#L23)

Version patterns to warn about.

#### Default Value

`[">="]`

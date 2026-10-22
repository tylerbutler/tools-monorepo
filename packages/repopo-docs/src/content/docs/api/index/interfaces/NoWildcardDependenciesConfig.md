---
editUrl: false
next: false
prev: false
title: "NoWildcardDependenciesConfig"
---

Defined in: policies/NoWildcardDependencies.ts:12

Configuration for the NoWildcardDependencies policy.

## Properties

### allowDev?

> `optional` **allowDev?**: `boolean`

Defined in: policies/NoWildcardDependencies.ts:29

If true, dev-dependencies are checked more leniently (only deny, not warn).

#### Default Value

```ts
true
```

***

### deny?

> `optional` **deny?**: `string`[]

Defined in: policies/NoWildcardDependencies.ts:17

Version patterns to deny outright.

#### Default Value

```ts
["*"]
```

***

### warn?

> `optional` **warn?**: `string`[]

Defined in: policies/NoWildcardDependencies.ts:23

Version patterns to warn about.

#### Default Value

`[">="]`

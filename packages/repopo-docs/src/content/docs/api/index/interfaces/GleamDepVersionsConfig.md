---
editUrl: false
next: false
prev: false
title: "GleamDepVersionsConfig"
---

Defined in: policies/GleamDepVersions.ts:12

Configuration for the GleamDepVersions policy.

## Properties

### requireVersions?

> `optional` **requireVersions?**: `boolean`

Defined in: policies/GleamDepVersions.ts:17

If true, require all dependencies to have version constraints.

#### Default Value

```ts
true
```

***

### warnUnbounded?

> `optional` **warnUnbounded?**: `boolean`

Defined in: policies/GleamDepVersions.ts:23

If true, warn on unbounded version ranges (e.g., `">= 1.0.0"` without an upper bound).

#### Default Value

```ts
false
```

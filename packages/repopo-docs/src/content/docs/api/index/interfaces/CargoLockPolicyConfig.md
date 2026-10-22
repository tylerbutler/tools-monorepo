---
editUrl: false
next: false
prev: false
title: "CargoLockPolicyConfig"
---

Defined in: policies/CargoLockPolicy.ts:14

Configuration for the CargoLockPolicy.

## Properties

### binaries?

> `optional` **binaries?**: `"require"` \| `"warn"` \| `"ignore"`

Defined in: policies/CargoLockPolicy.ts:23

Policy for binary crates.
- "require": Cargo.lock must be committed (default for binaries)
- "warn": Emit a warning if missing
- "ignore": Skip check

#### Default Value

```ts
"require"
```

***

### libraries?

> `optional` **libraries?**: `"require"` \| `"warn"` \| `"ignore"`

Defined in: policies/CargoLockPolicy.ts:33

Policy for library crates.
- "require": Cargo.lock must be committed
- "warn": Emit a warning if committed (default for libraries)
- "ignore": Skip check

#### Default Value

```ts
"ignore"
```

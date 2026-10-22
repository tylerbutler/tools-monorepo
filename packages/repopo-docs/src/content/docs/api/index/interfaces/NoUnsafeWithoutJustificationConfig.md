---
editUrl: false
next: false
prev: false
title: "NoUnsafeWithoutJustificationConfig"
---

Defined in: policies/NoUnsafeWithoutJustification.ts:9

Configuration for the NoUnsafeWithoutJustification policy.

## Properties

### excludePaths?

> `optional` **excludePaths?**: `string`[]

Defined in: policies/NoUnsafeWithoutJustification.ts:19

Paths to exclude from this check (e.g., FFI modules).

***

### requireComment?

> `optional` **requireComment?**: `string`

Defined in: policies/NoUnsafeWithoutJustification.ts:14

The comment prefix to look for before unsafe blocks.

#### Default Value

```ts
"// SAFETY:"
```

---
editUrl: false
next: false
prev: false
title: "PolicyRunnerOptions"
---

Defined in: runner.ts:64

Shared Promise and Effection runner options.

## Properties

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: runner.ts:72

***

### exclude?

> `optional` **exclude?**: readonly (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: runner.ts:70

***

### files?

> `optional` **files?**: readonly `string`[]

Defined in: runner.ts:69

Selection limits only file policies. Defaults to inventory when supplied.

***

### fix?

> `optional` **fix?**: `boolean`

Defined in: runner.ts:71

***

### inventory?

> `optional` **inventory?**: [`RepositoryInventory`](/api/index/type-aliases/repositoryinventory/)

Defined in: runner.ts:67

***

### policies

> **policies**: readonly [`ConfiguredPolicy`](/api/index/type-aliases/configuredpolicy/)[]

Defined in: runner.ts:65

***

### root

> **root**: `string`

Defined in: runner.ts:66

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: runner.ts:73

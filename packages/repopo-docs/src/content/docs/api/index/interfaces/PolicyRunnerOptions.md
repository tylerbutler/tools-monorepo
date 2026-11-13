---
editUrl: false
next: false
prev: false
title: "PolicyRunnerOptions"
---

Defined in: [runner.ts:78](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L78)

Shared Promise and Effection runner options.

## Properties

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [runner.ts:86](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L86)

***

### exclude?

> `optional` **exclude?**: readonly (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [runner.ts:84](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L84)

***

### files?

> `optional` **files?**: readonly `string`[]

Defined in: [runner.ts:83](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L83)

Selection limits only file policies. Defaults to inventory when supplied.

***

### fix?

> `optional` **fix?**: `boolean`

Defined in: [runner.ts:85](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L85)

***

### inventory?

> `optional` **inventory?**: [`RepositoryInventory`](/api/index/type-aliases/repositoryinventory/)

Defined in: [runner.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L81)

***

### policies

> **policies**: readonly [`ConfiguredPolicy`](/api/index/type-aliases/configuredpolicy/)[]

Defined in: [runner.ts:79](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L79)

***

### root

> **root**: `string`

Defined in: [runner.ts:80](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L80)

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [runner.ts:87](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L87)

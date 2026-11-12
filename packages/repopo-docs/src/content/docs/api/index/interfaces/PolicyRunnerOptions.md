---
editUrl: false
next: false
prev: false
title: "PolicyRunnerOptions"
---

Defined in: [runner.ts:73](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L73)

Shared Promise and Effection runner options.

## Properties

### changes?

> `optional` **changes?**: [`RepositoryChangeSet`](/api/index/interfaces/repositorychangeset/)

Defined in: [runner.ts:77](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L77)

***

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [runner.ts:82](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L82)

***

### exclude?

> `optional` **exclude?**: readonly (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [runner.ts:80](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L80)

***

### files?

> `optional` **files?**: readonly `string`[]

Defined in: [runner.ts:79](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L79)

Selection limits only file policies. Defaults to inventory when supplied.

***

### fix?

> `optional` **fix?**: `boolean`

Defined in: [runner.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L81)

***

### inventory?

> `optional` **inventory?**: [`RepositoryInventory`](/api/index/type-aliases/repositoryinventory/)

Defined in: [runner.ts:76](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L76)

***

### policies

> **policies**: readonly [`ConfiguredPolicy`](/api/index/type-aliases/configuredpolicy/)[]

Defined in: [runner.ts:74](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L74)

***

### root

> **root**: `string`

Defined in: [runner.ts:75](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L75)

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [runner.ts:83](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L83)

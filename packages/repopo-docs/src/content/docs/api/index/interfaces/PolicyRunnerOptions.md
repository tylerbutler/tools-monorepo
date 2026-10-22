---
editUrl: false
next: false
prev: false
title: "PolicyRunnerOptions"
---

Defined in: [runner.ts:68](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L68)

Shared Promise and Effection runner options.

## Properties

### concurrency?

> `optional` **concurrency?**: `number`

Defined in: [runner.ts:76](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L76)

***

### exclude?

> `optional` **exclude?**: readonly (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [runner.ts:74](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L74)

***

### files?

> `optional` **files?**: readonly `string`[]

Defined in: [runner.ts:73](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L73)

Selection limits only file policies. Defaults to inventory when supplied.

***

### fix?

> `optional` **fix?**: `boolean`

Defined in: [runner.ts:75](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L75)

***

### inventory?

> `optional` **inventory?**: [`RepositoryInventory`](/api/index/type-aliases/repositoryinventory/)

Defined in: [runner.ts:71](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L71)

***

### policies

> **policies**: readonly [`ConfiguredPolicy`](/api/index/type-aliases/configuredpolicy/)[]

Defined in: [runner.ts:69](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L69)

***

### root

> **root**: `string`

Defined in: [runner.ts:70](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L70)

***

### signal?

> `optional` **signal?**: `AbortSignal`

Defined in: [runner.ts:77](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/runner.ts#L77)

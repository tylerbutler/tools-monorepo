---
editUrl: false
next: false
prev: false
title: "collectRepositoryChanges"
---

> **collectRepositoryChanges**(`root`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`RepositoryChangeSet`](/api/index/interfaces/repositorychangeset/)\>

Defined in: [repositoryChanges.ts:112](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/repositoryChanges.ts#L112)

Collect changes once; does not fetch or require an actual pull request.

## Parameters

### root

`string`

### options?

[`RepositoryChangeOptions`](/api/index/interfaces/repositorychangeoptions/) = `{}`

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`RepositoryChangeSet`](/api/index/interfaces/repositorychangeset/)\>

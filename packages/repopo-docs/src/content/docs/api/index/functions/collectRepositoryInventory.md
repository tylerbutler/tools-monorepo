---
editUrl: false
next: false
prev: false
title: "collectRepositoryInventory"
---

> **collectRepositoryInventory**(`root`, `options?`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<readonly [`RepositoryFile`](/api/index/type-aliases/repositoryfile/)[]\>

Defined in: [repositoryChanges.ts:137](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/repositoryChanges.ts#L137)

Collect the full inventory with Git statuses; does not fetch or require an actual pull request.

## Parameters

### root

`string`

### options?

#### base?

`string`

#### mode?

`"pr"` \| `"local"` \| `"staged"`

## Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<readonly [`RepositoryFile`](/api/index/type-aliases/repositoryfile/)[]\>

---
editUrl: false
next: false
prev: false
title: "RepopoConfig"
---

Defined in: [config.ts:6](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L6)

Repository-wide policy configuration.

## Properties

### changes?

> `optional` **changes?**: [`RepositoryChangeOptions`](/api/index/interfaces/repositorychangeoptions/)

Defined in: [config.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L11)

Options used when a CLI check requests a change snapshot.

***

### excludeFiles?

> `optional` **excludeFiles?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [config.ts:9](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L9)

Repo-relative regex exclusions. Strings are case-insensitive.

***

### policies?

> `optional` **policies?**: [`ConfiguredPolicy`](/api/index/type-aliases/configuredpolicy/)[]

Defined in: [config.ts:7](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L7)

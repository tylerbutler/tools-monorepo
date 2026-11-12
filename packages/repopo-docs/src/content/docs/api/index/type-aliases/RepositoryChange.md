---
editUrl: false
next: false
prev: false
title: "RepositoryChange"
---

> **RepositoryChange** = \{ `path`: `string`; `status`: `"added"` \| `"modified"` \| `"deleted"` \| `"type-changed"`; \} \| \{ `oldPath`: `string`; `path`: `string`; `status`: `"renamed"`; \}

Defined in: [repositoryChanges.ts:10](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/repositoryChanges.ts#L10)

Repo-relative Git paths; renames retain both endpoints.

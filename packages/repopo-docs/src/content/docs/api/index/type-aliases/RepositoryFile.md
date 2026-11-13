---
editUrl: false
next: false
prev: false
title: "RepositoryFile"
---

> **RepositoryFile** = (\{ `path`: `string`; `status`: `"unchanged"` \| `"added"` \| `"modified"` \| `"deleted"` \| `"type-changed"`; \} \| \{ `path`: `string`; `previousPath`: `string`; `status`: `"renamed"`; \}) & `object`

Defined in: [repositoryChanges.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/repositoryChanges.ts#L11)

Repo-relative Git paths; renames retain both endpoints.

## Type Declaration

### exists?

> `readonly` `optional` **exists?**: `boolean`

Working-tree presence when it differs from status (for example an unstaged deletion in PR mode).

---
editUrl: false
next: false
prev: false
title: "PolicyNames"
---

> **PolicyNames**\<`T`\> = `{ [K in keyof T]: T[K] extends RepoPolicy<DefaultPolicyConfigType> ? T[K]["name"] : never }`\[`number`\]

Defined in: [config.ts:11](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L11)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### T

`T` *extends* readonly [`RepoPolicy`](/api/interfaces/repopolicy/)\<[`DefaultPolicyConfigType`](/api/type-aliases/defaultpolicyconfigtype/)\>[]

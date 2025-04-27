---
editUrl: false
next: false
prev: false
title: "PerPolicySettings"
---

> **PerPolicySettings**\<`T`\> = `{ [K in T[number]["name"]]?: T[number] extends RepoPolicy<infer C> ? C : never }` \| `undefined`

Defined in: [config.ts:7](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L7)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### T

`T` *extends* readonly [`RepoPolicy`](/api/interfaces/repopolicy/)\<[`DefaultPolicyConfigType`](/api/type-aliases/defaultpolicyconfigtype/)\>[]

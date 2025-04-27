---
editUrl: false
next: false
prev: false
title: "PerPolicySettings"
---

> **PerPolicySettings**\<`T`\> = `{ [K in PolicyNames<T>]?: Extract<T[number], { name: K }> extends RepoPolicy<infer C> ? C : never }` \| `undefined`

Defined in: [config.ts:22](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L22)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### T

`T` *extends* readonly [`RepoPolicy`](/api/interfaces/repopolicy/)\<`any`\>[]

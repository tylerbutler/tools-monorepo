---
editUrl: false
next: false
prev: false
title: "PolicyOptions"
---

Defined in: [makePolicy.ts:25](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L25)

Options for configuring a policy instance.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### exclude?

> `optional` **exclude?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [makePolicy.ts:37](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L37)

File paths matching these patterns will be excluded from this policy.
Patterns are matched against repo-relative paths.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### instanceId?

> `optional` **instanceId?**: `string`

Defined in: [makePolicy.ts:31](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L31)

A stable identifier for this configured policy instance.

This is required when the same policy definition is configured more than once.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

---
editUrl: false
next: false
prev: false
title: "PolicyInstanceSettings"
---

Defined in: [policy.ts:178](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L178)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C`

## Properties

### config?

> `optional` **config**: `C`

Defined in: [policy.ts:190](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L190)

The config that is applied to the policy instance.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### excludeFiles?

> `optional` **excludeFiles**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:185](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L185)

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from policy.

Paths will be matched relative to the root of the repo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

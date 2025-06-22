---
editUrl: false
next: false
prev: false
title: "RepopoConfig"
---

Defined in: config.ts:13

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### excludeFiles?

> `optional` **excludeFiles**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: config.ts:26

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policies?

> `optional` **policies**: [`PolicyInstance`](/api/type-aliases/policyinstance/)\<`any`\>[]

Defined in: config.ts:20

An array of policies that are enabled.

See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

---
editUrl: false
next: false
prev: false
title: "PolicyConfig"
---

Defined in: [config.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L16)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### excludeFiles?

> `optional` **excludeFiles**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [config.ts:26](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L26)

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### excludePoliciesForFiles?

> `optional` **excludePoliciesForFiles**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]\>

Defined in: [config.ts:32](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L32)

An object with a policy name as keys that map to an array of strings/regular expressions to
exclude that rule from being checked.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policies?

> `optional` **policies**: [`RepoPolicy`](/api/interfaces/repopolicy/)\<`any`\>[]

Defined in: [config.ts:20](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L20)

An array of policies that are enabled. If this is `undefined`, then all `DefaultPolicies` will be enabled.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policySettings?

> `optional` **policySettings**: [`PerPolicySettings`](/api/type-aliases/perpolicysettings/)

Defined in: [config.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L34)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

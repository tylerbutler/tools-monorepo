---
editUrl: false
next: false
prev: false
title: "RepopoConfig"
---

Defined in: [config.ts:19](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L19)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Properties

### excludeFiles?

> `optional` **excludeFiles**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [config.ts:31](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L31)

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### excludePoliciesForFiles?

> `optional` **excludePoliciesForFiles**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]\>

Defined in: [config.ts:37](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L37)

An object with a policy name as keys that map to an array of strings/regular expressions to
exclude that rule from being checked.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### perPolicyConfig?

> `optional` **perPolicyConfig**: [`PerPolicySettings`](/api/type-aliases/perpolicysettings/)

Defined in: [config.ts:40](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L40)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policies?

> `optional` **policies**: [`RepoPolicy`](/api/interfaces/repopolicy/)\<`unknown`\>[]

Defined in: [config.ts:25](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L25)

An array of policies that are enabled.

See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

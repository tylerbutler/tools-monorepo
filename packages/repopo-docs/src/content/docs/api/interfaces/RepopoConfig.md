---
editUrl: false
next: false
prev: false
title: "RepopoConfig"
---

Defined in: [config.ts:36](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L36)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### T

`T` *extends* readonly [`RepoPolicy`](/api/interfaces/repopolicy/)\<[`DefaultPolicyConfigType`](/api/type-aliases/defaultpolicyconfigtype/)\>[] = *typeof* [`DefaultPolicies`](/api/variables/defaultpolicies/)

## Properties

### excludeFiles?

> `optional` **excludeFiles**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [config.ts:51](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L51)

An array of strings/regular expressions. File paths that match any of these expressions will be completely excluded
from policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### excludePoliciesForFiles?

> `optional` **excludePoliciesForFiles**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]\>

Defined in: [config.ts:57](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L57)

An object with a policy name as keys that map to an array of strings/regular expressions to
exclude that rule from being checked.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### perPolicyConfig?

> `optional` **perPolicyConfig**: [`PerPolicySettings`](/api/type-aliases/perpolicysettings/)\<`T`\>

Defined in: [config.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L63)

Configuration specific to each policy. The keys are policy names and the values are the config type
specified by that policy's generic parameter.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### policies?

> `optional` **policies**: `T`

Defined in: [config.ts:45](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L45)

An array of policies that are enabled.

See `DefaultPolicies` for the policies that will be enabled by default if this is `undefined`.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

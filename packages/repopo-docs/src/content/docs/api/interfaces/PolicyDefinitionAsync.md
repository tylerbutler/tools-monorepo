---
editUrl: false
next: false
prev: false
title: "PolicyDefinitionAsync"
---

Defined in: [policy.ts:139](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L139)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>, `"handler"` \| `"resolver"`\>

## Type Parameters

### C

`C` = `undefined`

## Properties

### defaultConfig?

> `optional` **defaultConfig**: `C`

Defined in: [policy.ts:133](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L133)

A default config that will be used if none is provided.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Omit.defaultConfig`

***

### description?

> `optional` **description**: `string`

Defined in: [policy.ts:103](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L103)

A more detailed description of the policy and its intended function.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Omit.description`

***

### handlerAsync

> **handlerAsync**: [`PolicyHandlerAsync`](/api/type-aliases/policyhandlerasync/)\<`C`\>

Defined in: [policy.ts:150](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L150)

A handler function that checks if a file is compliant with the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Param

Repo-relative path to the file to check.

#### Param

Absolute path to the root of the repo.

#### Param

If true, automated policy fixes will be applied. Not all policies support automated fixes.

#### Returns

True if the file passed the policy; otherwise a PolicyFailure object will be returned.

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:108](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L108)

A regular expression that is used to match files in the repo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Omit.match`

***

### name

> **name**: `string`

Defined in: [policy.ts:98](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L98)

The name of the policy; displayed in UI and used in settings.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Omit.name`

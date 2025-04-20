---
editUrl: false
next: false
prev: false
title: "RepoPolicy"
---

Defined in: [policy.ts:90](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L90)

A RepoPolicy checks and applies policies to files in the repository.

Each policy has a name and a match regex for matching which files it should apply to. Every file in th repo is
enumerated and if it matches the regex for a policy, that policy is applied.

Each policy includes a handler function that checks a file against the policy and can optionally resolve any problems
(automated resolutions depend on the policy implementation).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **C** *extends* [`DefaultPolicyConfigType`](/api/type-aliases/defaultpolicyconfigtype/) = `unknown` \| `undefined`

type of configuration object used by the policy

## Properties

### description?

> `optional` **description**: `string`

Defined in: [policy.ts:101](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L101)

A more detailed description of the policy and its intended function.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### handler

> **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:117](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L117)

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

Defined in: [policy.ts:106](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L106)

A regular expression that is used to match files in the repo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### name

> **name**: `string`

Defined in: [policy.ts:96](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L96)

The name of the policy; displayed in UI and used in settings.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolver?

> `optional` **resolver**: [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:126](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L126)

A resolver function that can be used to automatically address the policy violation.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Param

Repo-relative path to the file to check.

#### Param

Absolute path to the root of the repo.

#### Returns

true if the file passed the policy; otherwise a PolicyFailure object will be returned.

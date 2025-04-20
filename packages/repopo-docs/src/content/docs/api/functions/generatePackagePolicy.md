---
editUrl: false
next: false
prev: false
title: "generatePackagePolicy"
---

> **generatePackagePolicy**\<`J`, `C`\>(`name`, `packagePolicy`): [`RepoPolicy`](/api/interfaces/repopolicy/)\<`C`\>

Defined in: [policyGenerators/generatePackagePolicy.ts:13](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generatePackagePolicy.ts#L13)

Define a repo policy for package.json files.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

• **J** = `PackageJson`

• **C** = `undefined`

## Parameters

### name

`string`

### packagePolicy

[`PackageJsonHandler`](/api/type-aliases/packagejsonhandler/)\<`J`, `C`\>

## Returns

[`RepoPolicy`](/api/interfaces/repopolicy/)\<`C`\>

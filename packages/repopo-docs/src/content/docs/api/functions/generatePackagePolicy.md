---
editUrl: false
next: false
prev: false
title: "generatePackagePolicy"
---

> **generatePackagePolicy**\<`J`, `C`\>(`name`, `packagePolicy`): [`RepoPolicyDefinition`](/api/interfaces/repopolicydefinition/)\<`C`\>

Defined in: [policyGenerators/generatePackagePolicy.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyGenerators/generatePackagePolicy.ts#L28)

Define a repo policy for package.json files.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### J

`J` = `PackageJson`

### C

`C` = `undefined`

## Parameters

### name

`string`

### packagePolicy

[`PackageJsonHandler`](/api/type-aliases/packagejsonhandler/)\<`J`, `C`\>

## Returns

[`RepoPolicyDefinition`](/api/interfaces/repopolicydefinition/)\<`C`\>

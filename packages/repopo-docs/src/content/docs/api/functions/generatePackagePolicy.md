---
editUrl: false
next: false
prev: false
title: "generatePackagePolicy"
---

> **generatePackagePolicy**\<`J`, `C`\>(`name`, `packagePolicy`): [`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>

Defined in: policyDefiners/definePackagePolicy.ts:27

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

[`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>

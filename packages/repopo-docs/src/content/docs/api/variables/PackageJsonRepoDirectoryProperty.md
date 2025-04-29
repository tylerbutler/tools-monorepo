---
editUrl: false
next: false
prev: false
title: "PackageJsonRepoDirectoryProperty"
---

> `const` **PackageJsonRepoDirectoryProperty**: [`RepoPolicyDefinition`](/api/interfaces/repopolicydefinition/)\<`undefined`\>

Defined in: [policies/PackageJsonRepoDirectoryProperty.ts:14](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageJsonRepoDirectoryProperty.ts#L14)

A RepoPolicy that checks that the repository.directory property in package.json is set correctly. If the repository
field is a string instead of an object the package will be ignored.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

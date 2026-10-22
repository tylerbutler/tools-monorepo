---
editUrl: false
next: false
prev: false
title: "PackageFolderName"
---

> `const` **PackageFolderName**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackageFolderNameConfig`](/api/index/interfaces/packagefoldernameconfig/) \| `undefined`\>

Defined in: [policies/PackageFolderName.ts:142](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageFolderName.ts#L142)

A policy that ensures package folder names match package names.

This policy helps maintain a consistent and predictable file structure
in monorepos by ensuring that folder names correspond to package names.
This makes it easier to locate packages in the file system.

## Remarks

The policy compares the immediate parent folder name of the package.json
against the package name. For scoped packages, the scope can optionally
be stripped based on the `stripScopes` configuration.

For example:
- `packages/my-lib/package.json` with name `my-lib` ✓
- `packages/my-lib/package.json` with name `@myorg/my-lib` ✓ (if `@myorg` is in `stripScopes`)
- `packages/wrong-name/package.json` with name `my-lib` ✗

## Example

```typescript
import { makePolicy } from "repopo";
import { PackageFolderName } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    makePolicy(PackageFolderName, {
      stripScopes: ["@myorg", "@internal"],
      excludePackages: ["@myorg/special-case"],
    }),
  ],
};
```

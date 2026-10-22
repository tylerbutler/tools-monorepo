---
editUrl: false
next: false
prev: false
title: "PackagePrivateField"
---

> `const` **PackagePrivateField**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackagePrivateFieldConfig`](/api/index/interfaces/packageprivatefieldconfig/) \| `undefined`\> & `object`

Defined in: [policies/PackagePrivateField.ts:211](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackagePrivateField.ts#L211)

A policy that enforces the `private` field in package.json based on package scope or name.

This policy is essential for monorepos where publishing control is important:

- Prevent accidental publishing of internal packages
- Ensure public packages don't have `private: true` blocking publishing
- Allow experimental packages to choose their own publishing status

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

The policy evaluates packages in the following order:

1. If the package matches `mustPublish`, it must NOT have `private: true`
2. If the package matches `mustBePrivate`, it MUST have `private: true`
3. If the package matches `mayPublish`, no enforcement is applied
4. Otherwise, the `unmatchedPackages` setting determines behavior (defaults to requiring private)

## Example

```typescript
import { makePolicy } from "repopo";
import { PackagePrivateField } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    makePolicy(PackagePrivateField, {
      mustPublish: ["@myorg/*"],
      mustBePrivate: ["@internal/*"],
      mayPublish: ["@experimental/*"],
      unmatchedPackages: "private",
    }),
  ],
};
```

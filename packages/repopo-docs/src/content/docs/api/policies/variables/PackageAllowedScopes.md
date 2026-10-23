---
editUrl: false
next: false
prev: false
title: "PackageAllowedScopes"
---

> `const` **PackageAllowedScopes**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackageAllowedScopesConfig`](/api/index/interfaces/packageallowedscopesconfig/) \| `undefined`\> & `object`

Defined in: [policies/PackageAllowedScopes.ts:143](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageAllowedScopes.ts#L143)

A policy that ensures packages use only allowed scopes and package names.

This policy prevents accidental introduction of new npm scopes or unscoped packages
in a monorepo. It helps maintain naming consistency and prevents typos or mistakes
when creating new packages.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

The policy checks packages in the following order:

1. If the package is scoped (starts with `@`), check if its scope is in `allowedScopes`
2. If the package is unscoped, check if it's in `unscopedPackages`
3. If neither check passes, the policy fails

The "root" package (common in monorepos) is automatically skipped.

## Example

```typescript
import { makePolicy } from "repopo";
import { PackageAllowedScopes } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    makePolicy(PackageAllowedScopes, {
      config: {
        allowedScopes: ["@myorg", "@internal"],
        unscopedPackages: ["legacy-package"],
      },
    }),
  ],
};
```

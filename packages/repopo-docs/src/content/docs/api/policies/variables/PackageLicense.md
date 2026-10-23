---
editUrl: false
next: false
prev: false
title: "PackageLicense"
---

> `const` **PackageLicense**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackageLicenseSettings`](/api/index/interfaces/packagelicensesettings/) \| `undefined`\>

Defined in: [policies/PackageLicense.ts:101](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageLicense.ts#L101)

A repo policy that ensures each package has a LICENSE file that matches the root LICENSE.

## Remarks

This policy is essential for monorepos where individual packages are published
to npm. Each published package should include a LICENSE file, and it should
match the root repository's LICENSE to ensure consistent licensing.

The policy:
1. Checks if a LICENSE file exists in the package directory
2. Compares it with the root LICENSE file
3. Can auto-fix by copying the root LICENSE to the package directory

By default, private packages are skipped since they're not published.

## Example

```typescript
import { makePolicy } from "repopo";
import { PackageLicense } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    // Use defaults (skip private, look for LICENSE)
    makePolicy(PackageLicense),

    // Or require LICENSE for all packages including private
    makePolicy(PackageLicense, { skipPrivate: false }),
  ],
};
```

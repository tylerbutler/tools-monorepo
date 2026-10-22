---
editUrl: false
next: false
prev: false
title: "PackageEsmType"
---

> `const` **PackageEsmType**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackageEsmTypeConfig`](/api/index/interfaces/packageesmtypeconfig/) \| `undefined`\>

Defined in: policies/PackageEsmType.ts:371

A policy that ensures the `type` field in package.json is correctly set.

This policy helps maintain consistency in how packages declare their module format,
which is essential for proper module resolution in Node.js and bundlers.

## Remarks

The policy can operate in two modes:

1. **Required Type**: Set `requiredType` to enforce a specific type for all packages
2. **Detection**: Set `detectFromExports: true` to detect the expected type from
   the package's exports or main field

When `detectFromExports` is enabled, the policy looks for:
- `.mjs` extensions or `"import"` conditions → expects `"module"`
- `.cjs` extensions or `"require"` conditions → expects `"commonjs"`

## Example

```typescript
import { makePolicy } from "repopo";
import { PackageEsmType } from "repopo/policies";

// Require all packages to be ESM
makePolicy(PackageEsmType, { requiredType: "module" })

// Or detect based on exports
makePolicy(PackageEsmType, { detectFromExports: true })
```

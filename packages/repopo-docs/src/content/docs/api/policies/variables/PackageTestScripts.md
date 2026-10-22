---
editUrl: false
next: false
prev: false
title: "PackageTestScripts"
---

> `const` **PackageTestScripts**: [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`PackageTestScriptsConfig`](/api/index/interfaces/packagetestscriptsconfig/) \| `undefined`\> & `object`

Defined in: [policies/PackageTestScripts.ts:213](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/PackageTestScripts.ts#L213)

A policy that ensures packages have test scripts when test files exist.

This policy helps maintain testing discipline by requiring test scripts
for packages that have test directories or test framework dependencies.

## Type Declaration

### requiresConfig

> **requiresConfig**: `true`

## Remarks

The policy detects that tests are expected based on:

1. **Test directories**: If `test/`, `tests/`, or `__tests__/` exists
2. **Test dependencies**: If vitest, jest, mocha, etc. are in devDependencies

When tests are detected, the policy requires specified test scripts to exist.

## Example

```typescript
import { makePolicy } from "repopo";
import { PackageTestScripts } from "repopo/policies";

const config: RepopoConfig = {
  policies: [
    makePolicy(PackageTestScripts, {
      testDirectories: ["test", "tests"],
      testDependencies: ["vitest", "jest"],
      requiredScripts: ["test"],
    }),
  ],
};
```

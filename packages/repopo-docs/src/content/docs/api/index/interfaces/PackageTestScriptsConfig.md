---
editUrl: false
next: false
prev: false
title: "PackageTestScriptsConfig"
---

Defined in: policies/PackageTestScripts.ts:32

Configuration for the PackageTestScripts policy.

This policy ensures that packages have appropriate test scripts when they
contain test files or have test-related dependencies.

The policy automatically determines what to check based on what's configured:
- If `testDirectories` is set, checks for test directories
- If `testDependencies` is set, checks for test dependencies
- If both are set, a package triggers validation if either condition is met

## Example

```typescript
const config: PackageTestScriptsConfig = {
  // Check for these test directories
  testDirectories: ["test", "tests", "__tests__"],
  // Require test script if these devDependencies exist
  testDependencies: ["vitest", "jest", "mocha"],
  // Required test script names
  requiredScripts: ["test"],
};
```

## Properties

### excludePackages?

> `optional` **excludePackages?**: `string`[]

Defined in: policies/PackageTestScripts.ts:73

Package names or scopes to exclude from validation.

***

### requiredScripts?

> `optional` **requiredScripts?**: `string`[]

Defined in: policies/PackageTestScripts.ts:68

Script names that must exist when tests are detected.

#### Default Value

```ts
["test"]
```

***

### testDependencies?

> `optional` **testDependencies?**: `string`[]

Defined in: policies/PackageTestScripts.ts:61

Test framework dependencies that indicate tests are expected.

If any of these appear in devDependencies, the policy will require
test scripts to be present.

If not set or empty, dependency checking is skipped.

#### Example

```typescript
testDependencies: ["vitest", "jest", "mocha", "@jest/globals"]
```

***

### testDirectories?

> `optional` **testDirectories?**: `string`[]

Defined in: policies/PackageTestScripts.ts:46

Directory names that indicate test files are present.

If any of these directories exist relative to the package.json,
the policy will require test scripts to be present.

If not set or empty, directory checking is skipped.

#### Example

```typescript
testDirectories: ["test", "tests", "__tests__"]
```

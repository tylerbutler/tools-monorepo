---
editUrl: false
next: false
prev: false
title: "definePackagePolicy"
---

> **definePackagePolicy**\<`J`, `C`\>(`args`): [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

Defined in: [policyDefiners/definePackagePolicy.ts:97](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L97)

Define a repo policy for package.json files.

## Type Parameters

### J

`J` = `PackageJson`

### C

`C` = `undefined`

## Parameters

### args

[`DefinePackagePolicyArgs`](/api/interfaces/definepackagepolicyargs/)\<`J`, `C`\>

Policy metadata, parsed-JSON handler, and optional defaults.

## Returns

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

A file policy that reads and parses matching package.json files.

## Remarks

This is a helper function that creates a policy pre-configured to match
package.json files. The handler receives the parsed JSON content.

## Example

```typescript
const MyPackagePolicy = definePackagePolicy({
  name: "MyPackagePolicy",
  description: "Ensures package.json has required fields",
  handler: async (json, { file }) => {
    if (!json.name) {
      return { error: "Missing name", fixable: false };
    }
    return true;
  },
});
```

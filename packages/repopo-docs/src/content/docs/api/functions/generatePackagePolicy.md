---
editUrl: false
next: false
prev: false
title: "generatePackagePolicy"
---

> **generatePackagePolicy**\<`J`, `C`\>(`args`): [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

Defined in: [policyDefiners/definePackagePolicy.ts:93](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L93)

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

### args

[`DefinePackagePolicyArgs`](/api/interfaces/definepackagepolicyargs/)\<`J`, `C`\>

## Returns

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

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

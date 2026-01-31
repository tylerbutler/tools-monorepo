---
editUrl: false
next: false
prev: false
title: "generatePackagePolicy"
---

> **generatePackagePolicy**\<`J`, `C`\>(`args`): [`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>

Defined in: [policyDefiners/definePackagePolicy.ts:84](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L84)

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

[`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>

## Example

```typescript
const MyPackagePolicy = definePackagePolicy({
  name: "MyPackagePolicy",
  description: "Ensures package.json has required fields",
  handler: function* (json, { file }) {
    if (!json.name) {
      return { name: "MyPackagePolicy", file, errorMessages: ["Missing name"] };
    }
    return true;
  },
});
```

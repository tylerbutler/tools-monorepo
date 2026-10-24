---
editUrl: false
next: false
prev: false
title: "definePackagePolicy"
---

## Call Signature

> **definePackagePolicy**\<`J`, `C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

Defined in: [policyDefiners/definePackagePolicy.ts:101](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L101)

Define a repo policy for package.json files.

### Type Parameters

#### J

`J` = `PackageJson`

#### C

`C` = `void`

### Parameters

#### args

[`DefinePackagePolicyArgs`](/api/index/interfaces/definepackagepolicyargs/)\<`J`, `C`\> & `object`

Policy metadata, parsed-JSON handler, and optional defaults.

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

A file policy that reads and parses matching package.json files.

### Remarks

This is a helper function that creates a policy pre-configured to match
package.json files. The handler receives the parsed JSON content.

### Example

```typescript
const MyPackagePolicy = definePackagePolicy({
  name: "MyPackagePolicy",
  description: "Ensures package.json has required fields",
  handler: async (json, { file }) => {
    if (!json.name) {
      return [{ message: "Missing name" }];
    }
    return [];
  },
});
```

## Call Signature

> **definePackagePolicy**\<`J`, `C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

Defined in: [policyDefiners/definePackagePolicy.ts:105](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L105)

Define a package policy that requires explicit configuration.

### Type Parameters

#### J

`J` = `PackageJson`

#### C

`C` = `void`

### Parameters

#### args

[`DefinePackagePolicyArgs`](/api/index/interfaces/definepackagepolicyargs/)\<`J`, `C`\> & `object`

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

## Call Signature

> **definePackagePolicy**\<`J`, `C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\>

Defined in: [policyDefiners/definePackagePolicy.ts:109](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/definePackagePolicy.ts#L109)

Define a package policy with optional configuration.

### Type Parameters

#### J

`J` = `PackageJson`

#### C

`C` = `void`

### Parameters

#### args

[`DefinePackagePolicyArgs`](/api/index/interfaces/definepackagepolicyargs/)\<`J`, `C`\>

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\>

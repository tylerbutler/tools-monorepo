---
editUrl: false
next: false
prev: false
title: "defineGleamPolicy"
---

## Call Signature

> **defineGleamPolicy**\<`C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

Defined in: policyDefiners/defineGleamPolicy.ts:101

Define a repo policy for gleam.toml files.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### args

[`DefineGleamPolicyArgs`](/api/index/interfaces/definegleampolicyargs/)\<`C`\> & `object`

Policy metadata, parsed-TOML handler, and optional defaults.

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

A file policy that reads and parses matching gleam.toml files.

### Remarks

This is a helper function that creates a policy pre-configured to match
gleam.toml files. The handler receives the parsed TOML content.

### Example

```typescript
const MyGleamPolicy = defineGleamPolicy({
  name: "MyGleamPolicy",
  description: "Ensures gleam.toml has required fields",
  handler: async (toml, { file }) => {
    if (!toml.name) {
      return [{ message: "Missing name field" }];
    }
    return [];
  },
});
```

## Call Signature

> **defineGleamPolicy**\<`C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

Defined in: policyDefiners/defineGleamPolicy.ts:105

Define a Gleam policy that requires explicit configuration.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### args

[`DefineGleamPolicyArgs`](/api/index/interfaces/definegleampolicyargs/)\<`C`\> & `object`

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

## Call Signature

> **defineGleamPolicy**\<`C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\>

Defined in: policyDefiners/defineGleamPolicy.ts:109

Define a Gleam policy with optional configuration.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### args

[`DefineGleamPolicyArgs`](/api/index/interfaces/definegleampolicyargs/)\<`C`\>

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\>

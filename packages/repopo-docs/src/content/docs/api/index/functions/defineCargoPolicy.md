---
editUrl: false
next: false
prev: false
title: "defineCargoPolicy"
---

## Call Signature

> **defineCargoPolicy**\<`C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

Defined in: policyDefiners/defineCargoPolicy.ts:103

Define a repo policy for Cargo.toml files.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### args

[`DefineCargoPolicyArgs`](/api/index/interfaces/definecargopolicyargs/)\<`C`\> & `object`

Policy metadata, parsed-TOML handler, and optional defaults.

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

A file policy that reads and parses matching Cargo.toml files.

### Remarks

This is a helper function that creates a policy pre-configured to match
Cargo.toml files. The handler receives the parsed TOML content.

### Example

```typescript
const MyCargoPolicy = defineCargoPolicy({
  name: "MyCargoPolicy",
  description: "Ensures Cargo.toml has required fields",
  handler: async (toml, { file }) => {
    const pkg = toml.package as Record<string, unknown> | undefined;
    if (!pkg?.name) {
      return [{ message: "Missing package name" }];
    }
    return [];
  },
});
```

## Call Signature

> **defineCargoPolicy**\<`C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

Defined in: policyDefiners/defineCargoPolicy.ts:107

Define a Cargo policy that requires explicit configuration.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### args

[`DefineCargoPolicyArgs`](/api/index/interfaces/definecargopolicyargs/)\<`C`\> & `object`

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\> & `object`

## Call Signature

> **defineCargoPolicy**\<`C`\>(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\>

Defined in: policyDefiners/defineCargoPolicy.ts:111

Define a Cargo policy with optional configuration.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### args

[`DefineCargoPolicyArgs`](/api/index/interfaces/definecargopolicyargs/)\<`C`\>

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<`C`\>

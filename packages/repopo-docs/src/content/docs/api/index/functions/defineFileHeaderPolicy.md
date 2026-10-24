---
editUrl: false
next: false
prev: false
title: "defineFileHeaderPolicy"
---

## Call Signature

> **defineFileHeaderPolicy**(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/)\> & `object`

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:115](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L115)

Creates a file-header policy that detects missing or incorrect headers and can replace them.

Supply [FileHeaderPolicyConfig](/api/index/interfaces/fileheaderpolicyconfig/) when configuring the policy, unless
the definition supplies a complete default.

### Parameters

#### args

[`DefineFileHeaderPolicyArgs`](/api/index/interfaces/definefileheaderpolicyargs/) & `object`

Policy metadata and header matching and replacement rules.

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/)\> & `object`

A file policy configured for the supplied file types.

### Example

```typescript
const MyHeaderPolicy = defineFileHeaderPolicy({
  name: "MyHeaderPolicy",
  description: "Ensures files have required headers",
  config: { match: /\.ts$/, lineStart: /// /, lineEnd: /\r?\n/, replacer: ... },
});
```

## Call Signature

> **defineFileHeaderPolicy**(`args`): [`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/)\> & `object`

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:122](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L122)

Define a header policy that requires explicit header configuration.

### Parameters

#### args

[`DefineFileHeaderPolicyArgs`](/api/index/interfaces/definefileheaderpolicyargs/)

### Returns

[`FilePolicyDefinition`](/api/index/interfaces/filepolicydefinition/)\<[`FileHeaderPolicyConfig`](/api/index/interfaces/fileheaderpolicyconfig/)\> & `object`

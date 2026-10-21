---
editUrl: false
next: false
prev: false
title: "defineFileHeaderPolicy"
---

> **defineFileHeaderPolicy**(`args`): [`PolicyShape`](/api/interfaces/policyshape/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:111](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L111)

Creates a file-header policy that detects missing or incorrect headers and can replace them.

The handler skips checks when no [FileHeaderPolicyConfig](/api/interfaces/fileheaderpolicyconfig/) is supplied.

## Parameters

### args

[`DefineFileHeaderPolicyArgs`](/api/interfaces/definefileheaderpolicyargs/)

Policy metadata and header matching and replacement rules.

## Returns

[`PolicyShape`](/api/interfaces/policyshape/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

A file policy configured for the supplied file types.

## Example

```typescript
const MyHeaderPolicy = defineFileHeaderPolicy({
  name: "MyHeaderPolicy",
  description: "Ensures files have required headers",
  config: { match: /\.ts$/, lineStart: /// /, lineEnd: /\r?\n/, replacer: ... },
});
```

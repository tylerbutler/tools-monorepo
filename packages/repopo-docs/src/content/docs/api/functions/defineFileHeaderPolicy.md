---
editUrl: false
next: false
prev: false
title: "defineFileHeaderPolicy"
---

> **defineFileHeaderPolicy**(`args`): [`PolicyDefinition`](/api/interfaces/policydefinition/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

Defined in: [policyDefiners/defineFileHeaderPolicy.ts:109](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineFileHeaderPolicy.ts#L109)

Given a [FileHeaderPolicyConfig](/api/interfaces/fileheaderpolicyconfig/), produces a function that detects correct file headers
and returns an error string if the header is missing or incorrect.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Parameters

### args

[`DefineFileHeaderPolicyArgs`](/api/interfaces/definefileheaderpolicyargs/)

## Returns

[`PolicyDefinition`](/api/interfaces/policydefinition/)\<[`FileHeaderPolicyConfig`](/api/interfaces/fileheaderpolicyconfig/)\>

## Example

```typescript
const MyHeaderPolicy = defineFileHeaderPolicy({
  name: "MyHeaderPolicy",
  description: "Ensures files have required headers",
  config: { match: /\.ts$/, lineStart: /// /, lineEnd: /\r?\n/, replacer: ... },
});
```

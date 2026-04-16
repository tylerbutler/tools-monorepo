---
editUrl: false
next: false
prev: false
title: "makePolicyDefinition"
---

> **makePolicyDefinition**\<`C`\>(`args`): [`PolicyDefinition`](/api/type-aliases/policydefinition/)\<`C`\>

Defined in: [makePolicy.ts:163](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L163)

Creates a [PolicyDefinition](/api/type-aliases/policydefinition/) from the provided arguments.

:::caution[Deprecated]
Define policies as object literals satisfying [PolicyShape](/api/interfaces/policyshape/) instead.
:::

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `undefined`

## Parameters

### args

[`PolicyDefinitionInput`](/api/type-aliases/policydefinitioninput/)\<`C`\>

## Returns

[`PolicyDefinition`](/api/type-aliases/policydefinition/)\<`C`\>

## Example

```typescript
const MyPolicy = makePolicyDefinition({
  name: "MyPolicy",
  description: "Ensures files follow conventions",
  match: /\.ts$/,
  handler: async ({ file }) => true,
});
```

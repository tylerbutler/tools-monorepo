---
editUrl: false
next: false
prev: false
title: "makePolicyDefinition"
---

> **makePolicyDefinition**\<`C`\>(`args`): [`PolicyDefinition`](/api/type-aliases/policydefinition/)\<`C`\>

Defined in: [makePolicy.ts:252](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L252)

Creates a [PolicyDefinition](/api/type-aliases/policydefinition/) from the provided arguments.

:::caution[Deprecated]
Define policies as object literals satisfying [PolicyShape](/api/interfaces/policyshape/) instead.
:::

## Type Parameters

### C

`C` = `undefined`

## Parameters

### args

[`PolicyDefinitionInput`](/api/type-aliases/policydefinitioninput/)\<`C`\>

Policy metadata, handler, optional resolver, and defaults.

## Returns

[`PolicyDefinition`](/api/type-aliases/policydefinition/)\<`C`\>

A file-policy definition.

## Example

```typescript
const MyPolicy = makePolicyDefinition({
  name: "MyPolicy",
  description: "Ensures files follow conventions",
  match: /\.ts$/,
  handler: async ({ file }) => true,
});
```

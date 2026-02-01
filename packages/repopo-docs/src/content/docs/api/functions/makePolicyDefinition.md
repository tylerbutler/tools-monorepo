---
editUrl: false
next: false
prev: false
title: "makePolicyDefinition"
---

> **makePolicyDefinition**\<`C`\>(`args`): [`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>

Defined in: [makePolicy.ts:37](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L37)

Creates a [PolicyDefinition](/api/interfaces/policydefinition/) from the provided arguments.

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

[`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>

## Remarks

This function accepts an object with all policy properties, making it easier
to add new optional properties in the future without breaking changes.

## Example

```typescript
const MyPolicy = makePolicyDefinition({
  name: "MyPolicy",
  description: "Ensures files follow conventions",
  match: /\.ts$/,
  handler: async ({ file }) => true,
});
```

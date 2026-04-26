---
editUrl: false
next: false
prev: false
title: "defineGleamPolicy"
---

> **defineGleamPolicy**\<`C`\>(`args`): [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

Defined in: [policyDefiners/defineGleamPolicy.ts:94](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L94)

Define a repo policy for gleam.toml files.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `undefined`

## Parameters

### args

[`DefineGleamPolicyArgs`](/api/interfaces/definegleampolicyargs/)\<`C`\>

## Returns

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

## Remarks

This is a helper function that creates a policy pre-configured to match
gleam.toml files. The handler receives the parsed TOML content.

## Example

```typescript
const MyGleamPolicy = defineGleamPolicy({
  name: "MyGleamPolicy",
  description: "Ensures gleam.toml has required fields",
  handler: async (toml, { file }) => {
    if (!toml.name) {
      return { error: "Missing name field", fixable: false };
    }
    return true;
  },
});
```

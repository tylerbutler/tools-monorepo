---
editUrl: false
next: false
prev: false
title: "defineCargoPolicy"
---

> **defineCargoPolicy**\<`C`\>(`args`): [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

Defined in: [policyDefiners/defineCargoPolicy.ts:95](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineCargoPolicy.ts#L95)

Define a repo policy for Cargo.toml files.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `undefined`

## Parameters

### args

[`DefineCargoPolicyArgs`](/api/interfaces/definecargopolicyargs/)\<`C`\>

## Returns

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

## Remarks

This is a helper function that creates a policy pre-configured to match
Cargo.toml files. The handler receives the parsed TOML content.

## Example

```typescript
const MyCargoPolicy = defineCargoPolicy({
  name: "MyCargoPolicy",
  description: "Ensures Cargo.toml has required fields",
  handler: async (toml, { file }) => {
    const pkg = toml.package as Record<string, unknown> | undefined;
    if (!pkg?.name) {
      return { error: "Missing package name", fixable: false };
    }
    return true;
  },
});
```

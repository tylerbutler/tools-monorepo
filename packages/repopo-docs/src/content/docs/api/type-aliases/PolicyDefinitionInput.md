---
editUrl: false
next: false
prev: false
title: "PolicyDefinitionInput"
---

> **PolicyDefinitionInput**\<`C`\> = [`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\>

Defined in: [makePolicy.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L16)

Input arguments for creating a policy definition.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `undefined`

## Remarks

This type is identical to [PolicyDefinition](/api/interfaces/policydefinition/) but is used as the input type
for [makePolicyDefinition](/api/functions/makepolicydefinition/) to make the API more explicit.

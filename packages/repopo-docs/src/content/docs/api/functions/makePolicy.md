---
editUrl: false
next: false
prev: false
title: "makePolicy"
---

> **makePolicy**\<`C`\>(`definition`, `config?`, `settings?`): [`PolicyInstance`](/api/type-aliases/policyinstance/)\<`C`\>

Defined in: [makePolicy.ts:50](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L50)

Combine a [PolicyDefinition](/api/interfaces/policydefinition/) with a policy-specific config and other settings to produce a [PolicyInstance](/api/type-aliases/policyinstance/).

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C`

## Parameters

### definition

[`PolicyDefinition`](/api/interfaces/policydefinition/)\<`C`\> | [`PolicyDefinitionAsync`](/api/interfaces/policydefinitionasync/)\<`C`\>

### config?

`C`

### settings?

[`PolicyInstanceSettings`](/api/interfaces/policyinstancesettings/)\<`C`\>

## Returns

[`PolicyInstance`](/api/type-aliases/policyinstance/)\<`C`\>

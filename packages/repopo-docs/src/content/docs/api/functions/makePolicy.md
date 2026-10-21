---
editUrl: false
next: false
prev: false
title: "makePolicy"
---

## Call Signature

> **makePolicy**\<`C`\>(`definition`, `config?`, `settings?`): [`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

Defined in: [makePolicy.ts:257](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L257)

Combine a [PolicyDefinition](/api/type-aliases/policydefinition/) with a policy-specific config and other settings.

:::caution[Deprecated]
Use the `policy` function instead, which has a simpler API.
:::

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

### Type Parameters

#### C

`C`

### Parameters

#### definition

[`RepositoryPolicyDefinition`](/api/interfaces/repositorypolicydefinition/)\<`C`\>

#### config?

`C`

#### settings?

[`PolicyInstanceSettings`](/api/interfaces/policyinstancesettings/)\<`C`\>

### Returns

[`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

### Example

```typescript
makePolicy(NoJsFileExtensions, undefined, { excludeFiles: ["^bin/"] })
```

## Call Signature

> **makePolicy**\<`C`\>(`definition`, `config?`, `settings?`): [`PolicyInstance`](/api/type-aliases/policyinstance/)\<`C`\>

Defined in: [makePolicy.ts:263](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L263)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

### Type Parameters

#### C

`C`

### Parameters

#### definition

[`PolicyDefinition`](/api/type-aliases/policydefinition/)\<`C`\>

#### config?

`C`

#### settings?

[`PolicyInstanceSettings`](/api/interfaces/policyinstancesettings/)\<`C`\>

### Returns

[`PolicyInstance`](/api/type-aliases/policyinstance/)\<`C`\>

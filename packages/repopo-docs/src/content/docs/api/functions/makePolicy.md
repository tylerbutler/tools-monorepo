---
editUrl: false
next: false
prev: false
title: "makePolicy"
---

Combines a policy definition with configuration and legacy instance settings.

:::caution[Deprecated]
Use `policy()` instead.
:::

## Call Signature

> **makePolicy**\<`C`\>(`definition`, `config?`, `settings?`): [`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

Defined in: [makePolicy.ts:283](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L283)

Combine a [PolicyDefinition](/api/type-aliases/policydefinition/) with a policy-specific config and other settings.

:::caution[Deprecated]
Use the `policy` function instead, which has a simpler API.
:::

### Type Parameters

#### C

`C`

### Parameters

#### definition

[`RepositoryPolicyDefinition`](/api/interfaces/repositorypolicydefinition/)\<`C`\>

Repository policy to configure.

#### config?

`C`

Configuration override, taking precedence over settings and defaults.

#### settings?

[`PolicyInstanceSettings`](/api/interfaces/policyinstancesettings/)\<`C`\>

Instance identity, exclusions, and fallback configuration.

### Returns

[`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

A configured repository policy.

### Example

```typescript
makePolicy(NoJsFileExtensions, undefined, { excludeFiles: ["^bin/"] })
```

## Call Signature

> **makePolicy**\<`C`\>(`definition`, `config?`, `settings?`): [`PolicyInstance`](/api/type-aliases/policyinstance/)\<`C`\>

Defined in: [makePolicy.ts:300](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L300)

Combines a file-policy definition with configuration and legacy instance settings.

:::caution[Deprecated]
Use `policy()` instead.
:::

### Type Parameters

#### C

`C`

### Parameters

#### definition

[`PolicyDefinition`](/api/type-aliases/policydefinition/)\<`C`\>

File policy to configure.

#### config?

`C`

Configuration override, taking precedence over settings and defaults.

#### settings?

[`PolicyInstanceSettings`](/api/interfaces/policyinstancesettings/)\<`C`\>

Instance identity, exclusions, and fallback configuration.

### Returns

[`PolicyInstance`](/api/type-aliases/policyinstance/)\<`C`\>

A configured file policy.

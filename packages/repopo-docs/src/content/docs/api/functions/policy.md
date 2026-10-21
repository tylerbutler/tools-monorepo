---
editUrl: false
next: false
prev: false
title: "policy"
---

## Call Signature

> **policy**\<`C`\>(`policyDef`, `config?`, `options?`): [`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

Defined in: [makePolicy.ts:98](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L98)

Configure a policy for use in repopo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

### Type Parameters

#### C

`C` = `void`

### Parameters

#### policyDef

[`RepositoryPolicyDefinition`](/api/interfaces/repositorypolicydefinition/)\<`C`\>

#### config?

`C`

#### options?

[`PolicyOptions`](/api/interfaces/policyoptions/)

### Returns

[`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

### Remarks

This function takes a policy definition and returns a configured policy instance
that can be added to the `policies` array in `repopo.config.ts`.

Handlers are automatically normalized: async functions are wrapped for Effection
compatibility, while generator functions are used directly.

The second argument is policy configuration. Pass instance options as the third
argument, using `undefined` for configuration to retain the policy's defaults.

### Example

```typescript
// Policy with no config, just options
policy(NoJsFileExtensions, undefined, { exclude: ["^bin/"] })

// Policy with config
policy(PackageJsonProperties, { verbatim: { license: "MIT" } })

// Policy with config and options
policy(PackageJsonProperties, { verbatim: { license: "MIT" } }, { exclude: ["^vendor/"] })

// Duplicate policies need stable instance IDs
policy(PackageJsonProperties, sourceConfig, { instanceId: "source-packages" })
policy(PackageJsonProperties, testConfig, { instanceId: "test-packages" })
```

## Call Signature

> **policy**\<`C`\>(`policyDef`, `config?`, `options?`): [`ConfiguredFilePolicy`](/api/interfaces/configuredfilepolicy/)\<`C`\>

Defined in: [makePolicy.ts:104](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L104)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

### Type Parameters

#### C

`C` = `void`

### Parameters

#### policyDef

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

#### config?

`C`

#### options?

[`PolicyOptions`](/api/interfaces/policyoptions/)

### Returns

[`ConfiguredFilePolicy`](/api/interfaces/configuredfilepolicy/)\<`C`\>

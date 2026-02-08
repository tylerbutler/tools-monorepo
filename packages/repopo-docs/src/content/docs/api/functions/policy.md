---
editUrl: false
next: false
prev: false
title: "policy"
---

## Call Signature

> **policy**\<`C`\>(`policyDef`, `options?`): [`ConfiguredPolicy`](/api/interfaces/configuredpolicy/)\<`C`\>

Defined in: [makePolicy.ts:76](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L76)

Configure a policy for use in repopo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

### Type Parameters

#### C

`C` = `void`

### Parameters

#### policyDef

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

#### options?

[`PolicyOptions`](/api/interfaces/policyoptions/)

### Returns

[`ConfiguredPolicy`](/api/interfaces/configuredpolicy/)\<`C`\>

### Remarks

This function takes a policy definition and returns a configured policy instance
that can be added to the `policies` array in `repopo.config.ts`.

Handlers are automatically normalized: async functions are wrapped for Effection
compatibility, while generator functions are used directly.

### Example

```typescript
// Policy with no config, just options
policy(NoJsFileExtensions, { exclude: ["bin/*"] })

// Policy with config
policy(PackageJsonProperties, { verbatim: { license: "MIT" } })

// Policy with config and options
policy(PackageJsonProperties, { verbatim: { license: "MIT" } }, { exclude: ["vendor/*"] })
```

## Call Signature

> **policy**\<`C`\>(`policyDef`, `config`, `options?`): [`ConfiguredPolicy`](/api/interfaces/configuredpolicy/)\<`C`\>

Defined in: [makePolicy.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L81)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

### Type Parameters

#### C

`C`

### Parameters

#### policyDef

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

#### config

`C`

#### options?

[`PolicyOptions`](/api/interfaces/policyoptions/)

### Returns

[`ConfiguredPolicy`](/api/interfaces/configuredpolicy/)\<`C`\>

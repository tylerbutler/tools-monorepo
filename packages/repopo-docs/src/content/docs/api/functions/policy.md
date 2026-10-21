---
editUrl: false
next: false
prev: false
title: "policy"
---

Configures a file or repository policy with defaults and instance options.

## Call Signature

> **policy**\<`C`\>(`policyDef`, `config?`, `options?`): [`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

Defined in: [makePolicy.ts:103](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L103)

Configure a policy for use in repopo.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### policyDef

[`RepositoryPolicyDefinition`](/api/interfaces/repositorypolicydefinition/)\<`C`\>

Repository policy to configure.

#### config?

`C`

Configuration override; omitted or nullish values use the definition's defaults.

#### options?

[`PolicyOptions`](/api/interfaces/policyoptions/)

Instance identity and repo-relative file exclusions.

### Returns

[`ConfiguredRepositoryPolicy`](/api/type-aliases/configuredrepositorypolicy/)\<`C`\>

A configured repository policy.

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

Defined in: [makePolicy.ts:118](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/makePolicy.ts#L118)

Configures a file policy and normalizes its handler for Effection.

### Type Parameters

#### C

`C` = `void`

### Parameters

#### policyDef

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

File policy to configure.

#### config?

`C`

Configuration override; omitted or nullish values use the definition's defaults.

#### options?

[`PolicyOptions`](/api/interfaces/policyoptions/)

Instance identity and repo-relative file exclusions.

### Returns

[`ConfiguredFilePolicy`](/api/interfaces/configuredfilepolicy/)\<`C`\>

A configured file policy.

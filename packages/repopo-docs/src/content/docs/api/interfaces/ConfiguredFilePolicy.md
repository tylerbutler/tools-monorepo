---
editUrl: false
next: false
prev: false
title: "ConfiguredFilePolicy"
---

Defined in: [policy.ts:333](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L333)

A policy instance with configuration and exclusion settings applied.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

## Type Parameters

### C

`C` = `void`

Type of configuration object used by the policy

## Properties

### config?

> `optional` **config?**: `C`

Defined in: [policy.ts:344](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L344)

The configuration applied to this policy instance.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:287](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L287)

A default configuration that will be used if none is provided.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`defaultConfig`](/api/interfaces/policyshape/#defaultconfig)

***

### description

> **description**: `string`

Defined in: [policy.ts:265](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L265)

A detailed description of the policy and its purpose.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`description`](/api/interfaces/policyshape/#description)

***

### exclude?

> `optional` **exclude?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:349](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L349)

File paths matching these patterns will be excluded from this policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### excludeFiles?

> `optional` **excludeFiles?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:355](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L355)

File paths matching these patterns will be excluded from this policy.
Legacy alias for `exclude`.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### handler

> **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:275](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L275)

The handler function that checks if a file complies with the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`handler`](/api/interfaces/policyshape/#handler)

***

### instanceId?

> `optional` **instanceId?**: `string`

Defined in: [policy.ts:339](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L339)

An optional stable identifier for this configured policy instance.

This is required when the same policy definition is configured more than once.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:270](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L270)

A regular expression that matches files this policy applies to.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`match`](/api/interfaces/policyshape/#match)

***

### name

> **name**: `string`

Defined in: [policy.ts:260](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L260)

The name of the policy; displayed in UI and used in settings.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`name`](/api/interfaces/policyshape/#name)

***

### resolver?

> `optional` **resolver?**: [`PolicyResolver`](/api/type-aliases/policyresolver/)\<`C`\> \| [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:282](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L282)

An optional resolver function that can automatically fix violations.
Return a PolicyError with `fixed: true` after a successful fix.
Legacy PolicyFixResult resolvers remain supported.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`resolver`](/api/interfaces/policyshape/#resolver)

***

### scope?

> `optional` **scope?**: `"file"`

Defined in: [policy.ts:256](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L256)

File scope is the default for existing policies.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`scope`](/api/interfaces/policyshape/#scope)

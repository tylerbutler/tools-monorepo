---
editUrl: false
next: false
prev: false
title: "ConfiguredPolicy"
---

Defined in: [policy.ts:278](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L278)

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

> `optional` **config**: `C`

Defined in: [policy.ts:282](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L282)

The configuration applied to this policy instance.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### defaultConfig?

> `optional` **defaultConfig**: `C`

Defined in: [policy.ts:235](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L235)

A default configuration that will be used if none is provided.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`defaultConfig`](/api/interfaces/policyshape/#defaultconfig)

***

### description

> **description**: `string`

Defined in: [policy.ts:215](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L215)

A detailed description of the policy and its purpose.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`description`](/api/interfaces/policyshape/#description)

***

### ~~exclude?~~

> `optional` **exclude**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:288](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L288)

File paths matching these patterns will be excluded from this policy.

:::caution[Deprecated]
Use `excludeFiles` instead for backward compatibility.
:::

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### excludeFiles?

> `optional` **excludeFiles**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:293](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L293)

File paths matching these patterns will be excluded from this policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### handler

> **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:225](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L225)

The handler function that checks if a file complies with the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`handler`](/api/interfaces/policyshape/#handler)

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:220](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L220)

A regular expression that matches files this policy applies to.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`match`](/api/interfaces/policyshape/#match)

***

### name

> **name**: `string`

Defined in: [policy.ts:210](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L210)

The name of the policy; displayed in UI and used in settings.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`name`](/api/interfaces/policyshape/#name)

***

### resolver?

> `optional` **resolver**: [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:230](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L230)

An optional resolver function that can automatically fix violations.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`resolver`](/api/interfaces/policyshape/#resolver)

---
editUrl: false
next: false
prev: false
title: "ConfiguredPolicy"
---

Defined in: [policy.ts:275](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L275)

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

Defined in: [policy.ts:279](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L279)

The configuration applied to this policy instance.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### defaultConfig?

> `optional` **defaultConfig**: `C`

Defined in: [policy.ts:232](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L232)

A default configuration that will be used if none is provided.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`defaultConfig`](/api/interfaces/policyshape/#defaultconfig)

***

### description

> **description**: `string`

Defined in: [policy.ts:212](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L212)

A detailed description of the policy and its purpose.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`description`](/api/interfaces/policyshape/#description)

***

### ~~exclude?~~

> `optional` **exclude**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:285](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L285)

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

Defined in: [policy.ts:290](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L290)

File paths matching these patterns will be excluded from this policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### handler

> **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:222](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L222)

The handler function that checks if a file complies with the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`handler`](/api/interfaces/policyshape/#handler)

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:217](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L217)

A regular expression that matches files this policy applies to.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`match`](/api/interfaces/policyshape/#match)

***

### name

> **name**: `string`

Defined in: [policy.ts:207](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L207)

The name of the policy; displayed in UI and used in settings.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`name`](/api/interfaces/policyshape/#name)

***

### resolver?

> `optional` **resolver**: [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:227](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L227)

An optional resolver function that can automatically fix violations.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`resolver`](/api/interfaces/policyshape/#resolver)

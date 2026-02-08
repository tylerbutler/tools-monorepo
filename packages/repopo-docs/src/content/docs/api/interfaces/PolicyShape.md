---
editUrl: false
next: false
prev: false
title: "PolicyShape"
---

Defined in: [policy.ts:203](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L203)

Interface describing the shape of a policy definition.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extended by

- [`ConfiguredPolicy`](/api/interfaces/configuredpolicy/)

## Type Parameters

### C

`C` = `void`

Type of configuration object used by the policy

## Properties

### defaultConfig?

> `optional` **defaultConfig**: `C`

Defined in: [policy.ts:232](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L232)

A default configuration that will be used if none is provided.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### description

> **description**: `string`

Defined in: [policy.ts:212](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L212)

A detailed description of the policy and its purpose.

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

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:217](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L217)

A regular expression that matches files this policy applies to.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### name

> **name**: `string`

Defined in: [policy.ts:207](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L207)

The name of the policy; displayed in UI and used in settings.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolver?

> `optional` **resolver**: [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:227](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L227)

An optional resolver function that can automatically fix violations.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

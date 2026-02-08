---
editUrl: false
next: false
prev: false
title: "Policy"
---

Defined in: [policy.ts:247](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L247)

Abstract base class for creating policies with object-based construction.

## Remarks

This class accepts a [PolicyShape](/api/interfaces/policyshape/) object in its constructor,
making it easier to add new optional properties in the future without breaking changes.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C` = `void`

## Implements

- [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

## Constructors

### Constructor

> **new Policy**\<`C`\>(`definition`): `Policy`\<`C`\>

Defined in: [policy.ts:255](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L255)

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Parameters

##### definition

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

#### Returns

`Policy`\<`C`\>

## Properties

### defaultConfig?

> `readonly` `optional` **defaultConfig**: `C`

Defined in: [policy.ts:252](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L252)

A default configuration that will be used if none is provided.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`defaultConfig`](/api/interfaces/policyshape/#defaultconfig)

***

### description

> `readonly` **description**: `string`

Defined in: [policy.ts:249](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L249)

A detailed description of the policy and its purpose.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`description`](/api/interfaces/policyshape/#description)

***

### handler

> `readonly` **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:251](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L251)

The handler function that checks if a file complies with the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`handler`](/api/interfaces/policyshape/#handler)

***

### match

> `readonly` **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:250](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L250)

A regular expression that matches files this policy applies to.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`match`](/api/interfaces/policyshape/#match)

***

### name

> `readonly` **name**: `string`

Defined in: [policy.ts:248](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L248)

The name of the policy; displayed in UI and used in settings.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`name`](/api/interfaces/policyshape/#name)

***

### resolver?

> `readonly` `optional` **resolver**: [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:253](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L253)

An optional resolver function that can automatically fix violations.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`resolver`](/api/interfaces/policyshape/#resolver)

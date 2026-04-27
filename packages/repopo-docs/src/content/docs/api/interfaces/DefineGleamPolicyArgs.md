---
editUrl: false
next: false
prev: false
title: "DefineGleamPolicyArgs"
---

Defined in: [policyDefiners/defineGleamPolicy.ts:49](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L49)

Input arguments for defining a gleam.toml policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### C

`C`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policyDefiners/defineGleamPolicy.ts:68](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L68)

Optional default configuration for the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### description

> **description**: `string`

Defined in: [policyDefiners/defineGleamPolicy.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L58)

A description of the policy's purpose.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### handler

> **handler**: [`GleamTomlHandler`](/api/type-aliases/gleamtomlhandler/)\<`C`\>

Defined in: [policyDefiners/defineGleamPolicy.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L63)

The handler function that receives the parsed gleam.toml and policy arguments.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### name

> **name**: `string`

Defined in: [policyDefiners/defineGleamPolicy.ts:53](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policyDefiners/defineGleamPolicy.ts#L53)

The name of the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

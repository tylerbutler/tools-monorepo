---
editUrl: false
next: false
prev: false
title: "PolicyShape"
---

Defined in: [policy.ts:274](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L274)

Interface describing the shape of a policy definition.

## Extended by

- [`ConfiguredFilePolicy`](/api/interfaces/configuredfilepolicy/)

## Type Parameters

### C

`C` = `void`

Type of configuration object used by the policy

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:307](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L307)

A default configuration that will be used if none is provided.

***

### description

> **description**: `string`

Defined in: [policy.ts:285](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L285)

A detailed description of the policy and its purpose.

***

### handler

> **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:295](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L295)

The handler function that checks if a file complies with the policy.

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:290](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L290)

A regular expression that matches files this policy applies to.

***

### name

> **name**: `string`

Defined in: [policy.ts:280](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L280)

The name of the policy; displayed in UI and used in settings.

***

### resolver?

> `optional` **resolver?**: [`PolicyResolver`](/api/type-aliases/policyresolver/)\<`C`\> \| [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:302](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L302)

An optional resolver function that can automatically fix violations.
Return a PolicyError with `fixed: true` after a successful fix.
Legacy PolicyFixResult resolvers remain supported.

***

### scope?

> `optional` **scope?**: `"file"`

Defined in: [policy.ts:276](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L276)

File scope is the default for existing policies.

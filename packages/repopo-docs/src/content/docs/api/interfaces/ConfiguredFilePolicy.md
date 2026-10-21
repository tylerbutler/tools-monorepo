---
editUrl: false
next: false
prev: false
title: "ConfiguredFilePolicy"
---

Defined in: [policy.ts:366](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L366)

A policy instance with configuration and exclusion settings applied.

## Extends

- [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

## Type Parameters

### C

`C` = `void`

Type of configuration object used by the policy

## Properties

### config?

> `optional` **config?**: `C`

Defined in: [policy.ts:377](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L377)

The configuration applied to this policy instance.

***

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:307](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L307)

A default configuration that will be used if none is provided.

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`defaultConfig`](/api/interfaces/policyshape/#defaultconfig)

***

### description

> **description**: `string`

Defined in: [policy.ts:285](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L285)

A detailed description of the policy and its purpose.

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`description`](/api/interfaces/policyshape/#description)

***

### exclude?

> `optional` **exclude?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:384](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L384)

File paths matching these patterns will be excluded from this policy.
Strings are case-insensitive regular expressions; RegExp values retain their flags.
Paths are relative to the repository root.

***

### excludeFiles?

> `optional` **excludeFiles?**: (`string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp))[]

Defined in: [policy.ts:390](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L390)

File paths matching these patterns will be excluded from this policy.
Legacy alias for `exclude`.

***

### handler

> **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:295](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L295)

The handler function that checks if a file complies with the policy.

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`handler`](/api/interfaces/policyshape/#handler)

***

### instanceId?

> `optional` **instanceId?**: `string`

Defined in: [policy.ts:372](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L372)

An optional stable identifier for this configured policy instance.

This is required when the same policy definition is configured more than once.

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:290](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L290)

A regular expression that matches files this policy applies to.

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`match`](/api/interfaces/policyshape/#match)

***

### name

> **name**: `string`

Defined in: [policy.ts:280](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L280)

The name of the policy; displayed in UI and used in settings.

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`name`](/api/interfaces/policyshape/#name)

***

### resolver?

> `optional` **resolver?**: [`PolicyResolver`](/api/type-aliases/policyresolver/)\<`C`\> \| [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:302](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L302)

An optional resolver function that can automatically fix violations.
Return a PolicyError with `fixed: true` after a successful fix.
Legacy PolicyFixResult resolvers remain supported.

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`resolver`](/api/interfaces/policyshape/#resolver)

***

### scope?

> `optional` **scope?**: `"file"`

Defined in: [policy.ts:276](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L276)

File scope is the default for existing policies.

#### Inherited from

[`PolicyShape`](/api/interfaces/policyshape/).[`scope`](/api/interfaces/policyshape/#scope)

---
editUrl: false
next: false
prev: false
title: "Policy"
---

Defined in: [policy.ts:319](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L319)

Abstract base class for creating policies with object-based construction.

## Remarks

This class accepts a [PolicyShape](/api/interfaces/policyshape/) object in its constructor,
making it easier to add new optional properties in the future without breaking changes.

## Type Parameters

### C

`C` = `void`

## Implements

- [`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

## Constructors

### Constructor

> **new Policy**\<`C`\>(`definition`): `Policy`\<`C`\>

Defined in: [policy.ts:341](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L341)

Creates a policy from its definition.

#### Parameters

##### definition

[`PolicyShape`](/api/interfaces/policyshape/)\<`C`\>

File matching, handler, and optional defaults and resolver.

#### Returns

`Policy`\<`C`\>

## Properties

### defaultConfig?

> `readonly` `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:329](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L329)

Configuration used when no instance configuration is supplied.

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`defaultConfig`](/api/interfaces/policyshape/#defaultconfig)

***

### description

> `readonly` **description**: `string`

Defined in: [policy.ts:323](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L323)

Description of the policy's purpose.

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`description`](/api/interfaces/policyshape/#description)

***

### handler

> `readonly` **handler**: [`PolicyHandler`](/api/type-aliases/policyhandler/)\<`C`\>

Defined in: [policy.ts:327](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L327)

Checks each matching file and optionally applies fixes.

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`handler`](/api/interfaces/policyshape/#handler)

***

### match

> `readonly` **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:325](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L325)

Regular expression matched against repo-relative file paths.

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`match`](/api/interfaces/policyshape/#match)

***

### name

> `readonly` **name**: `string`

Defined in: [policy.ts:321](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L321)

Policy name used for display and configuration.

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`name`](/api/interfaces/policyshape/#name)

***

### resolver?

> `readonly` `optional` **resolver?**: [`PolicyResolver`](/api/type-aliases/policyresolver/)\<`C`\> \| [`PolicyStandaloneResolver`](/api/type-aliases/policystandaloneresolver/)\<`C`\>

Defined in: [policy.ts:331](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L331)

Optional standalone fixer called for violations not handled by the handler.

#### Implementation of

[`PolicyShape`](/api/interfaces/policyshape/).[`resolver`](/api/interfaces/policyshape/#resolver)

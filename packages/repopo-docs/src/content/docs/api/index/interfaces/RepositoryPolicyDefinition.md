---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyDefinition"
---

Defined in: [policy.ts:60](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L60)

Repository/change scopes run once over matching inventory; fixers are inline only.

## Type Parameters

### C

`C` = `void`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:71](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L71)

***

### description

> **description**: `string`

Defined in: [policy.ts:62](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L62)

***

### match?

> `optional` **match?**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L66)

Match repo-relative paths, including either rename endpoint; omitted means all entries.

***

### name

> **name**: `string`

Defined in: [policy.ts:61](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L61)

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: [policy.ts:72](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L72)

***

### resolver?

> `optional` **resolver?**: `undefined`

Defined in: [policy.ts:70](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L70)

***

### scope

> **scope**: `"repository"` \| `"changes"`

Defined in: [policy.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L64)

Changes scope requests Git status annotation (PR mode by default).

## Methods

### handler()

> **handler**(`args`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: [policy.ts:67](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L67)

#### Parameters

##### args

[`RepositoryPolicyArgs`](/api/index/interfaces/repositorypolicyargs/)\<`C`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

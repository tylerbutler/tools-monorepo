---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyDefinition"
---

Defined in: [policy.ts:60](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L60)

Repository scope is explicit; repository fixers are inline only.

## Type Parameters

### C

`C` = `void`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:69](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L69)

***

### description

> **description**: `string`

Defined in: [policy.ts:62](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L62)

***

### name

> **name**: `string`

Defined in: [policy.ts:61](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L61)

***

### requiresChanges?

> `optional` **requiresChanges?**: `boolean`

Defined in: [policy.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L64)

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: [policy.ts:70](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L70)

***

### resolver?

> `optional` **resolver?**: `undefined`

Defined in: [policy.ts:68](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L68)

***

### scope

> **scope**: `"repository"`

Defined in: [policy.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L63)

## Methods

### handler()

> **handler**(`args`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: [policy.ts:65](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L65)

#### Parameters

##### args

[`RepositoryPolicyArgs`](/api/index/interfaces/repositorypolicyargs/)\<`C`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

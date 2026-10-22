---
editUrl: false
next: false
prev: false
title: "FilePolicyDefinition"
---

Defined in: [policy.ts:45](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L45)

File scope is the default.

## Type Parameters

### C

`C` = `void`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:52](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L52)

***

### description

> **description**: `string`

Defined in: [policy.ts:47](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L47)

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: [policy.ts:49](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L49)

***

### name

> **name**: `string`

Defined in: [policy.ts:46](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L46)

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: [policy.ts:53](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L53)

***

### resolver?

> `optional` **resolver?**: (`args`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: [policy.ts:51](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L51)

#### Parameters

##### args

[`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`C`\>, `"resolve"`\> & `object`

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

***

### scope?

> `optional` **scope?**: `"file"`

Defined in: [policy.ts:48](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L48)

## Methods

### handler()

> **handler**(`args`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: [policy.ts:50](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L50)

#### Parameters

##### args

[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`C`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

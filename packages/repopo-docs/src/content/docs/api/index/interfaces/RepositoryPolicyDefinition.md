---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyDefinition"
---

Defined in: [policy.ts:57](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L57)

Repository scope is explicit; repository fixers are inline only.

## Type Parameters

### C

`C` = `void`

## Properties

### defaultConfig?

> `optional` **defaultConfig?**: `C`

Defined in: [policy.ts:65](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L65)

***

### description

> **description**: `string`

Defined in: [policy.ts:59](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L59)

***

### name

> **name**: `string`

Defined in: [policy.ts:58](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L58)

***

### requiresConfig?

> `optional` **requiresConfig?**: `boolean`

Defined in: [policy.ts:66](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L66)

***

### resolver?

> `optional` **resolver?**: `undefined`

Defined in: [policy.ts:64](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L64)

***

### scope

> **scope**: `"repository"`

Defined in: [policy.ts:60](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L60)

## Methods

### handler()

> **handler**(`args`): [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

Defined in: [policy.ts:61](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L61)

#### Parameters

##### args

[`RepositoryPolicyArgs`](/api/index/interfaces/repositorypolicyargs/)\<`C`\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\> \| `Operation`\<[`PolicyResult`](/api/index/type-aliases/policyresult/)\>

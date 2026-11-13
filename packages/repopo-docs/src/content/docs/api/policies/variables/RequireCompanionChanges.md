---
editUrl: false
next: false
prev: false
title: "RequireCompanionChanges"
---

> `const` **RequireCompanionChanges**: `object`

Defined in: [policies/RequireCompanionChanges.ts:14](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/RequireCompanionChanges.ts#L14)

Require a related update when trigger paths change.

## Type Declaration

### description

> **description**: `string` = `"Requires a related file change when trigger paths change."`

### handler

> **handler**: (`__namedParameters`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

#### Parameters

##### \_\_namedParameters

[`RepositoryPolicyArgs`](/api/index/interfaces/repositorypolicyargs/)\<\{ `companion`: `string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp); `trigger`: `string` \| [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp); \}\>

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`object`[]\>

### name

> **name**: `string` = `"RequireCompanionChanges"`

### requiresConfig

> **requiresConfig**: `true` = `true`

### scope

> **scope**: `"changes"` = `"changes"`

---
editUrl: false
next: false
prev: false
title: "FluidHandler"
---

Defined in: adapters/fluidFramework.ts:11

A FluidFramework build-tools policy handler interface.

This interface matches the `Handler` interface from `@fluidframework/build-tools`.

## Properties

### handler

> **handler**: (`file`, `root`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

Defined in: adapters/fluidFramework.ts:29

The handler function that checks a file against the policy.

#### Parameters

##### file

`string`

Absolute path to the file.

##### root

`string`

Path to the repo root.

#### Returns

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<`string` \| `undefined`\>

`undefined` if the check passes, otherwise an error message string.

***

### match

> **match**: [`RegExp`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/RegExp)

Defined in: adapters/fluidFramework.ts:20

A regex pattern that determines which files this handler applies to.

***

### name

> **name**: `string`

Defined in: adapters/fluidFramework.ts:15

The name of the handler, used for filtering and display.

***

### resolver?

> `optional` **resolver?**: (`file`, `root`) => [`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{ `message?`: `string`; `resolved`: `boolean`; \}\> \| \{ `message?`: `string`; `resolved`: `boolean`; \}

Defined in: adapters/fluidFramework.ts:38

Optional resolver function that attempts to fix policy violations.

#### Parameters

##### file

`string`

Absolute path to the file.

##### root

`string`

Path to the repo root.

#### Returns

An object indicating whether the fix was successful.

[`Promise`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Promise)\<\{ `message?`: `string`; `resolved`: `boolean`; \}\>

***

##### Type Literal

\{ `message?`: `string`; `resolved`: `boolean`; \}

###### message?

> `optional` **message?**: `string`

Optional explanation of the fix result.

###### resolved

> **resolved**: `boolean`

Whether the violation was fixed.

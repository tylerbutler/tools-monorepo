---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyArgs"
---

Defined in: policy.ts:20

Arguments supplied to a repository handler; selection never limits files.

## Extends

- [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`C`\>, `"file"`\>

## Type Parameters

### C

`C` = `void`

## Properties

### config?

> `optional` **config?**: `C`

Defined in: policy.ts:16

#### Inherited from

`Omit.config`

***

### files

> **files**: readonly `string`[]

Defined in: policy.ts:22

***

### resolve

> **resolve**: `boolean`

Defined in: policy.ts:15

#### Inherited from

[`PolicyArgs`](/api/index/interfaces/policyargs/).[`resolve`](/api/index/interfaces/policyargs/#resolve)

***

### root

> **root**: `string`

Defined in: policy.ts:14

#### Inherited from

[`PolicyArgs`](/api/index/interfaces/policyargs/).[`root`](/api/index/interfaces/policyargs/#root)

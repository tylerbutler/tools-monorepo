---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyArgs"
---

Defined in: [policy.ts:21](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L21)

Arguments supplied to a repository handler; selection never limits files.

## Extends

- [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyArgs`](/api/index/interfaces/policyargs/)\<`C`\>, `"file"`\>

## Type Parameters

### C

`C` = `void`

## Properties

### changes?

> `optional` **changes?**: [`RepositoryChangeSet`](/api/index/interfaces/repositorychangeset/)

Defined in: [policy.ts:25](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L25)

Complete pre-run change snapshot, independent of selection and inventory exclusions.

***

### config?

> `optional` **config?**: `C`

Defined in: [policy.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L17)

#### Inherited from

`Omit.config`

***

### files

> **files**: readonly `string`[]

Defined in: [policy.ts:23](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L23)

***

### resolve

> **resolve**: `boolean`

Defined in: [policy.ts:16](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L16)

#### Inherited from

[`PolicyArgs`](/api/index/interfaces/policyargs/).[`resolve`](/api/index/interfaces/policyargs/#resolve)

***

### root

> **root**: `string`

Defined in: [policy.ts:15](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L15)

#### Inherited from

[`PolicyArgs`](/api/index/interfaces/policyargs/).[`root`](/api/index/interfaces/policyargs/#root)

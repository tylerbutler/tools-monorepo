---
editUrl: false
next: false
prev: false
title: "RepositoryPolicyArgs"
---

Defined in: [policy.ts:104](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L104)

Arguments for a policy that runs once against the repository.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Extends

- [`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`PolicyArgs`](/api/interfaces/policyargs/)\<`C`\>, `"file"`\>

## Type Parameters

### C

`C` = `void`

## Properties

### config?

> `optional` **config?**: `C`

Defined in: [policy.ts:44](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L44)

Optional configuration for the policy.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

`Omit.config`

***

### files

> **files**: readonly `string`[]

Defined in: [policy.ts:107](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L107)

Full file inventory after global and per-policy exclusions, not stdin selection.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

***

### resolve

> **resolve**: `boolean`

Defined in: [policy.ts:39](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L39)

If true, the handler should resolve any violations automatically if possible.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyArgs`](/api/interfaces/policyargs/).[`resolve`](/api/interfaces/policyargs/#resolve)

***

### root

> **root**: `string`

Defined in: [policy.ts:34](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policy.ts#L34)

Absolute path to the root of the repo.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

#### Inherited from

[`PolicyArgs`](/api/interfaces/policyargs/).[`root`](/api/interfaces/policyargs/#root)

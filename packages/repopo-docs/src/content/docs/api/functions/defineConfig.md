---
editUrl: false
next: false
prev: false
title: "defineConfig"
---

> **defineConfig**\<`T`\>(`policies`, `config`): [`RepopoConfig`](/api/interfaces/repopoconfig/)\<`T`\>

Defined in: [config.ts:81](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/config.ts#L81)

Creates a type-safe repopo config with the given policies.

:::caution[Alpha]
This API should not be used in production and may be trimmed from a public release.
:::

## Type Parameters

### T

`T` *extends* readonly [`RepoPolicy`](/api/interfaces/repopolicy/)\<`any`\>[]

## Parameters

### policies

`T`

### config

[`Omit`](https://www.typescriptlang.org/docs/handbook/utility-types.html#omittype-keys)\<[`RepopoConfig`](/api/interfaces/repopoconfig/)\<`T`\>, `"policies"`\>

## Returns

[`RepopoConfig`](/api/interfaces/repopoconfig/)\<`T`\>

## Example

```ts
const policies = [PackageJsonSorted, SortTsconfigsPolicy] as const;
const config = defineConfig(policies, {
  perPolicyConfig: {
    SortTsconfigsPolicy: { order: ["1", "2"] }
  }
});
```

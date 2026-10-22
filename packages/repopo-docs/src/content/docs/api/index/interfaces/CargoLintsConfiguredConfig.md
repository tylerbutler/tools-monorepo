---
editUrl: false
next: false
prev: false
title: "CargoLintsConfiguredConfig"
---

Defined in: [policies/CargoLintsConfigured.ts:12](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoLintsConfigured.ts#L12)

Configuration for the CargoLintsConfigured policy.

## Properties

### required?

> `optional` **required?**: [`Record`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)\<`string`, `string`\>

Defined in: [policies/CargoLintsConfigured.ts:22](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoLintsConfigured.ts#L22)

Required clippy lint levels. Keys are lint names (without the `clippy::` prefix),
values are the minimum level ("warn" or "deny").

#### Example

```typescript
{ pedantic: "warn", nursery: "warn" }
```

***

### requireSection?

> `optional` **requireSection?**: `boolean`

Defined in: [policies/CargoLintsConfigured.ts:28](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/policies/CargoLintsConfigured.ts#L28)

If true, just require that a [lints.clippy] section exists (without checking specific lints).

#### Default Value

```ts
true
```

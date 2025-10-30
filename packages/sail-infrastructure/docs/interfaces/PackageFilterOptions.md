[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PackageFilterOptions

# Interface: PackageFilterOptions

Defined in: [packages/sail-infrastructure/src/filter.ts:103](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L103)

The criteria that should be used for filtering package-like objects from a collection.

## Properties

### private

```ts
private: boolean | undefined;
```

Defined in: [packages/sail-infrastructure/src/filter.ts:117](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L117)

If set, filters private packages in/out.

***

### scope?

```ts
optional scope: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:107](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L107)

If set, filters IN packages whose scope matches the strings provided.

***

### skipScope?

```ts
optional skipScope: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:112](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L112)

If set, filters OUT packages whose scope matches the strings provided.

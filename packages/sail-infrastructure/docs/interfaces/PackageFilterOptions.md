[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PackageFilterOptions

# Interface: PackageFilterOptions

Defined in: [packages/sail-infrastructure/src/filter.ts:97](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/filter.ts#L97)

The criteria that should be used for filtering package-like objects from a collection.

## Properties

### private

```ts
private: boolean | undefined;
```

Defined in: [packages/sail-infrastructure/src/filter.ts:111](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/filter.ts#L111)

If set, filters private packages in/out.

***

### scope?

```ts
optional scope: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:101](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/filter.ts#L101)

If set, filters IN packages whose scope matches the strings provided.

***

### skipScope?

```ts
optional skipScope: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:106](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/filter.ts#L106)

If set, filters OUT packages whose scope matches the strings provided.

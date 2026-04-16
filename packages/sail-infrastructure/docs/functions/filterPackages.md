[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / filterPackages

# Function: filterPackages()

```ts
function filterPackages<T>(packages, filters): Promise<T[]>;
```

Defined in: [packages/sail-infrastructure/src/filter.ts:253](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/filter.ts#L253)

Filters a list of packages by the filter criteria.

## Type Parameters

### T

`T` *extends* [`FilterablePackage`](../interfaces/FilterablePackage.md)

The type of the package-like objects being filtered.

## Parameters

### packages

`T`[]

An array of packages to be filtered.

### filters

[`PackageFilterOptions`](../interfaces/PackageFilterOptions.md)

The filter criteria to filter the packages by.

## Returns

`Promise`\<`T`[]\>

An array containing only the filtered items.

[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / selectAndFilterPackages

# Function: selectAndFilterPackages()

```ts
function selectAndFilterPackages<P>(
   buildProject, 
   selection, 
   filter?): Promise<{
  filtered: P[];
  selected: P[];
}>;
```

Defined in: [packages/sail-infrastructure/src/filter.ts:220](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/filter.ts#L220)

Selects packages from the BuildProject based on the selection criteria. The selected packages will be filtered by the
filter criteria if provided.

## Type Parameters

### P

`P` *extends* [`IPackage`](../interfaces/IPackage.md)\<[`PackageJson`](../type-aliases/PackageJson.md)\>

## Parameters

### buildProject

[`IBuildProject`](../interfaces/IBuildProject.md)\<`P`\>

The BuildProject.

### selection

[`PackageSelectionCriteria`](../interfaces/PackageSelectionCriteria.md)

The selection criteria to use to select packages.

### filter?

[`PackageFilterOptions`](../interfaces/PackageFilterOptions.md)

An optional filter criteria to filter selected packages by.

## Returns

`Promise`\<\{
  `filtered`: `P`[];
  `selected`: `P`[];
\}\>

An object containing the selected packages and the filtered packages.

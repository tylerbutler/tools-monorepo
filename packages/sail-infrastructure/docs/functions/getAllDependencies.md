[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / getAllDependencies

# Function: getAllDependencies()

```ts
function getAllDependencies(repo, packages): object;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:332](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L332)

Returns an object containing all the packages, release groups, and workspaces that a given set of packages depends
on. This function only considers packages in the BuildProject repo.

## Parameters

### repo

[`IBuildProject`](../interfaces/IBuildProject.md)

### packages

[`IPackage`](../interfaces/IPackage.md)\<[`PackageJson`](../type-aliases/PackageJson.md)\>[]

## Returns

`object`

### packages

```ts
packages: IPackage<PackageJson>[];
```

### releaseGroups

```ts
releaseGroups: IReleaseGroup[];
```

### workspaces

```ts
workspaces: IWorkspace[];
```

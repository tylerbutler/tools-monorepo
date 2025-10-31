[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / loadBuildProject

# Function: loadBuildProject()

```ts
function loadBuildProject<P>(
   searchPath, 
   infer, 
upstreamRemotePartialUrl?): IBuildProject<P>;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:313](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L313)

Searches for a BuildProject config file and loads the project from the config if found.

## Type Parameters

### P

`P` *extends* [`IPackage`](../interfaces/IPackage.md)\<[`PackageJson`](../type-aliases/PackageJson.md)\>

The type to use for Packages.

## Parameters

### searchPath

`string`

The path to start searching for a BuildProject config.

### infer

`boolean` = `false`

Set to true to always infer the build project config.

### upstreamRemotePartialUrl?

`string`

A partial URL to the upstream repo. This is used to find the local git remote that
corresponds to the upstream repo.

## Returns

[`IBuildProject`](../interfaces/IBuildProject.md)\<`P`\>

The loaded BuildProject.

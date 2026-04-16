[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / BuildProject

# Class: BuildProject\<P\>

Defined in: [packages/sail-infrastructure/src/buildProject.ts:30](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L30)

A BuildProject organizes a collection of npm packages into workspaces and release groups. A BuildProject can contain
multiple workspaces, and a workspace can in turn contain multiple release groups. Both workspaces and release groups
represent ways to organize packages in the repo, but their purpose and function are different.

See [IWorkspace](../interfaces/IWorkspace.md) and [IReleaseGroup](../interfaces/IReleaseGroup.md) for more details.

## Type Parameters

### P

`P` *extends* [`IPackage`](../interfaces/IPackage.md)

The type of [IPackage](../interfaces/IPackage.md) the repo uses. This can be any type that implements [IPackage](../interfaces/IPackage.md).

## Implements

- [`IBuildProject`](../interfaces/IBuildProject.md)\<`P`\>

## Constructors

### Constructor

```ts
new BuildProject<P>(
   searchPath, 
   infer, 
upstreamRemotePartialUrl?): BuildProject<P>;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:56](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L56)

#### Parameters

##### searchPath

`string`

The path that should be searched for a BuildProject config file.

##### infer

`boolean` = `false`

Set to true to always infer the build project config.

##### upstreamRemotePartialUrl?

`string`

A partial URL to the upstream (remote) repo. This can be set to the name of the repo on GitHub. For example,
"microsoft/FluidFramework".

#### Returns

`BuildProject`\<`P`\>

## Properties

### configuration

```ts
readonly configuration: BuildProjectConfig;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:40](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L40)

The configuration for the build project.

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`configuration`](../interfaces/IBuildProject.md#configuration)

***

### configurationSource

```ts
readonly configurationSource: string;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:42](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L42)

The source for the configuration. If the configuration is loaded from a file, this will be the path to the file. If
the configuration is inferred, this will be the string "INFERRED".

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`configurationSource`](../interfaces/IBuildProject.md#configurationsource)

***

### root

```ts
readonly root: string;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:35](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L35)

The absolute path to the root of the build project. This is the path where the config file is located, if one
exists.

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`root`](../interfaces/IBuildProject.md#root)

***

### upstreamRemotePartialUrl?

```ts
readonly optional upstreamRemotePartialUrl: string;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:63](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L63)

A partial URL to the upstream (remote) repo. This can be set to the name of the repo on GitHub. For example,
"microsoft/FluidFramework".

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`upstreamRemotePartialUrl`](../interfaces/IBuildProject.md#upstreamremotepartialurl)

## Accessors

### packages

#### Get Signature

```ts
get packages(): ReadonlyMap<PackageName, P>;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:171](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L171)

A map of all packages in the BuildProject.

##### Returns

`ReadonlyMap`\<[`PackageName`](../type-aliases/PackageName.md), `P`\>

A map of all packages in the BuildProject.

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`packages`](../interfaces/IBuildProject.md#packages)

***

### releaseGroups

#### Get Signature

```ts
get releaseGroups(): Map<ReleaseGroupName, IReleaseGroup>;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:162](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L162)

A map of all release groups in the BuildProject.

##### Returns

`Map`\<[`ReleaseGroupName`](../type-aliases/ReleaseGroupName.md), [`IReleaseGroup`](../interfaces/IReleaseGroup.md)\>

A map of all release groups in the BuildProject.

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`releaseGroups`](../interfaces/IBuildProject.md#releasegroups)

***

### workspaces

#### Get Signature

```ts
get workspaces(): Map<WorkspaceName, IWorkspace>;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:153](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L153)

A map of all workspaces in the BuildProject.

##### Returns

`Map`\<[`WorkspaceName`](../type-aliases/WorkspaceName.md), [`IWorkspace`](../interfaces/IWorkspace.md)\>

A map of all workspaces in the BuildProject.

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`workspaces`](../interfaces/IBuildProject.md#workspaces)

## Methods

### getGitRepository()

```ts
getGitRepository(): Promise<Readonly<SimpleGit>>;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:206](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L206)

If the BuildProject is within a Git repository, this function will return a SimpleGit instance rooted at the root
of the Git repository. If the BuildProject is _not_ within a Git repository, this function will throw a
[NotInGitRepository](NotInGitRepository.md) error.

#### Returns

`Promise`\<`Readonly`\<`SimpleGit`\>\>

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`getGitRepository`](../interfaces/IBuildProject.md#getgitrepository)

***

### getPackageReleaseGroup()

```ts
getPackageReleaseGroup(pkg): Readonly<IReleaseGroup>;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:226](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L226)

Returns the [IReleaseGroup](../interfaces/IReleaseGroup.md) associated with a package.

#### Parameters

##### pkg

`Readonly`\<`P`\>

#### Returns

`Readonly`\<[`IReleaseGroup`](../interfaces/IReleaseGroup.md)\>

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`getPackageReleaseGroup`](../interfaces/IBuildProject.md#getpackagereleasegroup)

***

### relativeToRepo()

```ts
relativeToRepo(p): string;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:186](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L186)

Transforms an absolute path to a path relative to the IBuildProject root.

#### Parameters

##### p

`string`

The path to make relative to the IBuildProject root.

#### Returns

`string`

The path relative to the IBuildProject root.

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`relativeToRepo`](../interfaces/IBuildProject.md#relativetorepo)

***

### reload()

```ts
reload(): void;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:194](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/buildProject.ts#L194)

Reload the BuildProject by calling `reload` on each workspace in the repository.

#### Returns

`void`

#### Implementation of

[`IBuildProject`](../interfaces/IBuildProject.md).[`reload`](../interfaces/IBuildProject.md#reload)

[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IBuildProject

# Interface: IBuildProject\<P\>

Defined in: packages/sail-infrastructure/src/types.ts:64

A BuildProject organizes a collection of npm packages into workspaces and release groups. A BuildProject can contain
multiple workspaces, and a workspace can in turn contain multiple release groups. Both workspaces and release groups
represent ways to organize packages in the repo, but their purpose and function are different.

See [IWorkspace](IWorkspace.md) and [IReleaseGroup](IReleaseGroup.md) for more details.

## Extends

- [`Reloadable`](Reloadable.md)

## Type Parameters

### P

`P` *extends* [`IPackage`](IPackage.md) = [`IPackage`](IPackage.md)

The type of [IPackage](IPackage.md) the repo uses. This can be any type that implements [IPackage](IPackage.md).

## Properties

### configuration

```ts
configuration: BuildProjectConfig;
```

Defined in: packages/sail-infrastructure/src/types.ts:94

The configuration for the build project.

***

### configurationSource

```ts
configurationSource: string;
```

Defined in: packages/sail-infrastructure/src/types.ts:100

The source for the configuration. If the configuration is loaded from a file, this will be the path to the file. If
the configuration is inferred, this will be the string "INFERRED".

***

### packages

```ts
packages: ReadonlyMap<PackageName, P>;
```

Defined in: packages/sail-infrastructure/src/types.ts:83

A map of all packages in the BuildProject.

***

### releaseGroups

```ts
releaseGroups: ReadonlyMap<ReleaseGroupName, IReleaseGroup>;
```

Defined in: packages/sail-infrastructure/src/types.ts:78

A map of all release groups in the BuildProject.

***

### root

```ts
root: string;
```

Defined in: packages/sail-infrastructure/src/types.ts:68

The absolute path to the root of the IBuildProject. This is the path where the config file is located.

***

### upstreamRemotePartialUrl?

```ts
optional upstreamRemotePartialUrl: string;
```

Defined in: packages/sail-infrastructure/src/types.ts:89

A partial URL to the upstream (remote) repo. This can be set to the name of the repo on GitHub. For example,
"microsoft/FluidFramework".

***

### workspaces

```ts
workspaces: ReadonlyMap<WorkspaceName, IWorkspace>;
```

Defined in: packages/sail-infrastructure/src/types.ts:73

A map of all workspaces in the BuildProject.

## Methods

### getGitRepository()

```ts
getGitRepository(): Promise<Readonly<SimpleGit>>;
```

Defined in: packages/sail-infrastructure/src/types.ts:117

If the BuildProject is within a Git repository, this function will return a SimpleGit instance rooted at the root
of the Git repository. If the BuildProject is _not_ within a Git repository, this function will throw a
[NotInGitRepository](../classes/NotInGitRepository.md) error.

#### Returns

`Promise`\<`Readonly`\<`SimpleGit`\>\>

#### Throws

A [NotInGitRepository](../classes/NotInGitRepository.md) error if the path is not within a Git repository.

***

### getPackageReleaseGroup()

```ts
getPackageReleaseGroup(pkg): Readonly<IReleaseGroup>;
```

Defined in: packages/sail-infrastructure/src/types.ts:122

Returns the [IReleaseGroup](IReleaseGroup.md) associated with a package.

#### Parameters

##### pkg

`Readonly`\<`P`\>

#### Returns

`Readonly`\<[`IReleaseGroup`](IReleaseGroup.md)\>

***

### relativeToRepo()

```ts
relativeToRepo(p): string;
```

Defined in: packages/sail-infrastructure/src/types.ts:108

Transforms an absolute path to a path relative to the IBuildProject root.

#### Parameters

##### p

`string`

The path to make relative to the IBuildProject root.

#### Returns

`string`

The path relative to the IBuildProject root.

***

### reload()

```ts
reload(): void;
```

Defined in: packages/sail-infrastructure/src/types.ts:152

Synchronously reload.

#### Returns

`void`

#### Inherited from

[`Reloadable`](Reloadable.md).[`reload`](Reloadable.md#reload)

[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IWorkspace

# Interface: IWorkspace

Defined in: [packages/sail-infrastructure/src/types.ts:182](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L182)

A workspace is a collection of packages, including a root package, that is managed using a package manager's
"workspaces" functionality. A BuildProject can contain multiple workspaces. Workspaces are defined and managed using
the package manager directly. A BuildProject builds on top of workspaces and relies on the package manager to install
and manage dependencies and interdependencies within the workspace.

A workspace defines the _physical layout_ of the packages within it. Workspaces are a generally a feature provided by
the package manager (npm, yarn, pnpm, etc.). A workspace is rooted in a particular folder, and uses the configuration
within that folder to determine what packages it contains. The configuration used is specific to the package manager.

The workspace is also the boundary at which dependencies are installed and managed. When you install dependencies for
a package in a workspace, all dependencies for all packages in the workspace will be installed. Within a workspace,
it is trivial to link multiple packages so they can depend on one another. The `IWorkspace` type is a thin wrapper on
top of these package manager features.

A BuildProject will only load packages identified by the package manager's workspace feature. That is, any package in
the repo that is not configured as part of a workspace is invisible to tools using the BuildProject.

Workspaces are not involved in versioning or releasing packages. They are used for dependency management only.
Release groups, on the other hand, are used to group packages into releasable groups. See [IReleaseGroup](IReleaseGroup.md) for
more information.

## Extends

- [`Installable`](Installable.md).[`Reloadable`](Reloadable.md)

## Properties

### buildProject

```ts
buildProject: IBuildProject;
```

Defined in: [packages/sail-infrastructure/src/types.ts:206](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L206)

The build project that the workspace belongs to.

***

### directory

```ts
directory: string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:191](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L191)

The absolute path to the root directory of the workspace. This directory will contain the workspace root package.

***

### name

```ts
name: WorkspaceName;
```

Defined in: [packages/sail-infrastructure/src/types.ts:186](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L186)

The name of the workspace.

***

### packageManager

```ts
packageManager: IPackageManager;
```

Defined in: [packages/sail-infrastructure/src/types.ts:217](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L217)

The package manager used to manage this workspace.

***

### packages

```ts
packages: IPackage<PackageJson>[];
```

Defined in: [packages/sail-infrastructure/src/types.ts:212](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L212)

An array of all the packages in the workspace. This includes the workspace root and any release group roots and
constituent packages as well.

***

### releaseGroups

```ts
releaseGroups: Map<ReleaseGroupName, IReleaseGroup>;
```

Defined in: [packages/sail-infrastructure/src/types.ts:201](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L201)

A map of all the release groups in the workspace.

***

### rootPackage

```ts
rootPackage: IPackage;
```

Defined in: [packages/sail-infrastructure/src/types.ts:196](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L196)

The root package of the workspace.

## Methods

### checkInstall()

```ts
checkInstall(): Promise<true | string[]>;
```

Defined in: [packages/sail-infrastructure/src/types.ts:132](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L132)

Returns `true` if the item is installed. If the item is not installed, an array of error strings will be returned.

#### Returns

`Promise`\<`true` \| `string`[]\>

#### Inherited from

[`Installable`](Installable.md).[`checkInstall`](Installable.md#checkinstall)

***

### install()

```ts
install(updateLockfile): Promise<boolean>;
```

Defined in: [packages/sail-infrastructure/src/types.ts:142](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L142)

Installs the item.

#### Parameters

##### updateLockfile

`boolean`

If true, the lockfile will be updated. Otherwise, the lockfile will not be updated. This
may cause the installation to fail and this function to throw an error.

#### Returns

`Promise`\<`boolean`\>

#### Throws

An error if `updateLockfile` is false and the lockfile is outdated.

#### Inherited from

[`Installable`](Installable.md).[`install`](Installable.md#install)

***

### reload()

```ts
reload(): void;
```

Defined in: [packages/sail-infrastructure/src/types.ts:152](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L152)

Synchronously reload.

#### Returns

`void`

#### Inherited from

[`Reloadable`](Reloadable.md).[`reload`](Reloadable.md#reload)

***

### toString()

```ts
toString(): string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:219](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L219)

Returns a string representation of an object.

#### Returns

`string`

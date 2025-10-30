[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PackageBase

# Abstract Class: PackageBase\<J, TAddProps\>

Defined in: [packages/sail-infrastructure/src/package.ts:35](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L35)

A base class for npm packages. A custom type can be used for the package.json schema, which is useful
when the package.json has custom keys/values.

## Type Parameters

### J

`J` *extends* [`PackageJson`](../type-aliases/PackageJson.md) = [`PackageJson`](../type-aliases/PackageJson.md)

The package.json type to use. This type must extend the [PackageJson](../type-aliases/PackageJson.md) type defined in this
package.

### TAddProps

`TAddProps` *extends* [`AdditionalPackageProps`](../type-aliases/AdditionalPackageProps.md) = `undefined`

Additional typed props that will be added to the package object.

## Implements

- [`IPackage`](../interfaces/IPackage.md)\<`J`\>

## Constructors

### Constructor

```ts
new PackageBase<J, TAddProps>(
   packageJsonFilePath, 
   workspace, 
   isWorkspaceRoot, 
   releaseGroup, 
   isReleaseGroupRoot, 
additionalProperties?): PackageBase<J, TAddProps>;
```

Defined in: [packages/sail-infrastructure/src/package.ts:79](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L79)

Create a new package from a package.json file. **Prefer the .load method to calling the contructor directly.**

#### Parameters

##### packageJsonFilePath

`string`

The path to a package.json file.

##### workspace

[`IWorkspace`](../interfaces/IWorkspace.md)

The workspace that this package belongs to.

##### isWorkspaceRoot

`boolean`

Set to true if this package is the root of a workspace.

##### releaseGroup

[`ReleaseGroupName`](../type-aliases/ReleaseGroupName.md)

The name of the release group that this package belongs to.

##### isReleaseGroupRoot

`boolean`

Whether the package is a release group root package or not. A release group may not have a root package, but if it
does, it will only have one.

##### additionalProperties?

`TAddProps`

An object with additional properties that should be added to the class. This is
useful to augment the package class with additional properties.

#### Returns

`PackageBase`\<`J`, `TAddProps`\>

## Properties

### isReleaseGroupRoot

```ts
isReleaseGroupRoot: boolean;
```

Defined in: [packages/sail-infrastructure/src/package.ts:108](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L108)

Whether the package is a release group root package or not. A release group may not have a root package, but if it
does, it will only have one.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`isReleaseGroupRoot`](../interfaces/IPackage.md#isreleasegrouproot)

***

### isWorkspaceRoot

```ts
readonly isWorkspaceRoot: boolean;
```

Defined in: [packages/sail-infrastructure/src/package.ts:98](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L98)

Whether the package is a workspace root package or not. A workspace will only have one root package.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`isWorkspaceRoot`](../interfaces/IPackage.md#isworkspaceroot)

***

### packageJsonFilePath

```ts
readonly packageJsonFilePath: string;
```

Defined in: [packages/sail-infrastructure/src/package.ts:83](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L83)

The absolute path to the package.json file for this package.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`packageJsonFilePath`](../interfaces/IPackage.md#packagejsonfilepath)

***

### releaseGroup

```ts
readonly releaseGroup: ReleaseGroupName;
```

Defined in: [packages/sail-infrastructure/src/package.ts:103](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L103)

The name of the release group that this package belongs to.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`releaseGroup`](../interfaces/IPackage.md#releasegroup)

***

### workspace

```ts
readonly workspace: IWorkspace;
```

Defined in: [packages/sail-infrastructure/src/package.ts:93](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L93)

The workspace that this package belongs to.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`workspace`](../interfaces/IPackage.md#workspace)

## Accessors

### combinedDependencies

#### Get Signature

```ts
get combinedDependencies(): Generator<PackageDependency, void>;
```

Defined in: [packages/sail-infrastructure/src/package.ts:120](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L120)

A generator that returns each dependency and the kind of dependency (dev, peer, etc.) for all of the package's
dependencies. This is useful to iterate overall all dependencies of the package.

##### Returns

`Generator`\<[`PackageDependency`](../interfaces/PackageDependency.md), `void`\>

A generator that returns each dependency and the kind of dependency (dev, peer, etc.) for all of the package's
dependencies. This is useful to iterate overall all dependencies of the package.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`combinedDependencies`](../interfaces/IPackage.md#combineddependencies)

***

### directory

#### Get Signature

```ts
get directory(): string;
```

Defined in: [packages/sail-infrastructure/src/package.ts:127](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L127)

The absolute path to the directory containing the package (that is, the directory that contains the package.json
for the package).

##### Returns

`string`

The absolute path to the directory containing the package (that is, the directory that contains the package.json
for the package).

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`directory`](../interfaces/IPackage.md#directory)

***

### name

#### Get Signature

```ts
get name(): PackageName;
```

Defined in: [packages/sail-infrastructure/src/package.ts:134](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L134)

The name of the package including the scope.

##### Returns

[`PackageName`](../type-aliases/PackageName.md)

The name of the package including the scope.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`name`](../interfaces/IPackage.md#name)

***

### nameColored

#### Get Signature

```ts
get nameColored(): string;
```

Defined in: [packages/sail-infrastructure/src/package.ts:141](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L141)

The name of the package color-coded with ANSI color codes for terminal output. The package name will always have
the same color.

##### Returns

`string`

The name of the package color-coded with ANSI color codes for terminal output. The package name will always have
the same color.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`nameColored`](../interfaces/IPackage.md#namecolored)

***

### packageJson

#### Get Signature

```ts
get packageJson(): J;
```

Defined in: [packages/sail-infrastructure/src/package.ts:148](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L148)

The package.json contents of the package.

##### Returns

`J`

The package.json contents of the package.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`packageJson`](../interfaces/IPackage.md#packagejson)

***

### private

#### Get Signature

```ts
get private(): boolean;
```

Defined in: [packages/sail-infrastructure/src/package.ts:155](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L155)

`true` if the package is private; `false` otherwise. This is similar to the field in package.json, but always
returns a boolean value. If the package.json is missing the `private` field, this will return false.

##### Returns

`boolean`

`true` if the package is private; `false` otherwise. This is similar to the field in package.json, but always
returns a boolean value. If the package.json is missing the `private` field, this will return false.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`private`](../interfaces/IPackage.md#private)

***

### version

#### Get Signature

```ts
get version(): string;
```

Defined in: [packages/sail-infrastructure/src/package.ts:162](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L162)

The version of the package. This is the same as `packageJson.version`.

##### Returns

`string`

The version of the package. This is the same as `packageJson.version`.

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`version`](../interfaces/IPackage.md#version)

## Methods

### checkInstall()

```ts
checkInstall(): Promise<true | string[]>;
```

Defined in: [packages/sail-infrastructure/src/package.ts:194](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L194)

Returns `true` if the item is installed. If the item is not installed, an array of error strings will be returned.

#### Returns

`Promise`\<`true` \| `string`[]\>

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`checkInstall`](../interfaces/IPackage.md#checkinstall)

***

### getScript()

```ts
getScript(name): string | undefined;
```

Defined in: [packages/sail-infrastructure/src/package.ts:187](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L187)

Returns the value of a script in the package's package.json, or undefined if a script with the provided key is not
found.

#### Parameters

##### name

`string`

#### Returns

`string` \| `undefined`

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`getScript`](../interfaces/IPackage.md#getscript)

***

### install()

```ts
install(updateLockfile): Promise<boolean>;
```

Defined in: [packages/sail-infrastructure/src/package.ts:218](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L218)

Installs the dependencies for all packages in this package's workspace.

#### Parameters

##### updateLockfile

`boolean`

#### Returns

`Promise`\<`boolean`\>

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`install`](../interfaces/IPackage.md#install)

***

### reload()

```ts
reload(): void;
```

Defined in: [packages/sail-infrastructure/src/package.ts:176](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L176)

Reload the package from the on-disk package.json.

#### Returns

`void`

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`reload`](../interfaces/IPackage.md#reload)

***

### savePackageJson()

```ts
savePackageJson(): Promise<void>;
```

Defined in: [packages/sail-infrastructure/src/package.ts:169](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L169)

Saves any changes to the packageJson property to the package.json file on disk.

#### Returns

`Promise`\<`void`\>

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`savePackageJson`](../interfaces/IPackage.md#savepackagejson)

***

### toString()

```ts
toString(): string;
```

Defined in: [packages/sail-infrastructure/src/package.ts:180](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/package.ts#L180)

Returns a string representation of an object.

#### Returns

`string`

#### Implementation of

[`IPackage`](../interfaces/IPackage.md).[`toString`](../interfaces/IPackage.md#tostring)

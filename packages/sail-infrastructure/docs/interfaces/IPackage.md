[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IPackage

# Interface: IPackage\<J\>

Defined in: [packages/sail-infrastructure/src/types.ts:377](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L377)

A common type representing an npm package. A custom type can be used for the package.json schema, which is useful
when the package.json has custom keys/values.

## Extends

- [`Installable`](Installable.md).[`Reloadable`](Reloadable.md)

## Type Parameters

### J

`J` *extends* [`PackageJson`](../type-aliases/PackageJson.md) = [`PackageJson`](../type-aliases/PackageJson.md)

The package.json type to use. This type must extend the [PackageJson](../type-aliases/PackageJson.md) type defined in this
package.

## Properties

### combinedDependencies

```ts
combinedDependencies: Generator<PackageDependency, void>;
```

Defined in: [packages/sail-infrastructure/src/types.ts:454](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L454)

A generator that returns each dependency and the kind of dependency (dev, peer, etc.) for all of the package's
dependencies. This is useful to iterate overall all dependencies of the package.

***

### directory

```ts
readonly directory: string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:395](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L395)

The absolute path to the directory containing the package (that is, the directory that contains the package.json
for the package).

***

### isReleaseGroupRoot

```ts
isReleaseGroupRoot: boolean;
```

Defined in: [packages/sail-infrastructure/src/types.ts:432](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L432)

Whether the package is a release group root package or not. A release group may not have a root package, but if it
does, it will only have one.

***

### isWorkspaceRoot

```ts
readonly isWorkspaceRoot: boolean;
```

Defined in: [packages/sail-infrastructure/src/types.ts:421](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L421)

Whether the package is a workspace root package or not. A workspace will only have one root package.

***

### name

```ts
readonly name: PackageName;
```

Defined in: [packages/sail-infrastructure/src/types.ts:383](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L383)

The name of the package including the scope.

***

### nameColored

```ts
readonly nameColored: string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:389](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L389)

The name of the package color-coded with ANSI color codes for terminal output. The package name will always have
the same color.

***

### packageJson

```ts
packageJson: J;
```

Defined in: [packages/sail-infrastructure/src/types.ts:400](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L400)

The package.json contents of the package.

***

### packageJsonFilePath

```ts
readonly packageJsonFilePath: string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:437](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L437)

The absolute path to the package.json file for this package.

***

### private

```ts
readonly private: boolean;
```

Defined in: [packages/sail-infrastructure/src/types.ts:411](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L411)

`true` if the package is private; `false` otherwise. This is similar to the field in package.json, but always
returns a boolean value. If the package.json is missing the `private` field, this will return false.

***

### releaseGroup

```ts
releaseGroup: ReleaseGroupName;
```

Defined in: [packages/sail-infrastructure/src/types.ts:426](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L426)

The name of the release group that this package belongs to.

***

### version

```ts
readonly version: string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:405](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L405)

The version of the package. This is the same as `packageJson.version`.

***

### workspace

```ts
readonly workspace: IWorkspace;
```

Defined in: [packages/sail-infrastructure/src/types.ts:416](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L416)

The workspace that this package belongs to.

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

### getScript()

```ts
getScript(name): string | undefined;
```

Defined in: [packages/sail-infrastructure/src/types.ts:443](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L443)

Returns the value of a script in the package's package.json, or undefined if a script with the provided key is not
found.

#### Parameters

##### name

`string`

#### Returns

`string` \| `undefined`

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

### savePackageJson()

```ts
savePackageJson(): Promise<void>;
```

Defined in: [packages/sail-infrastructure/src/types.ts:448](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L448)

Saves any changes to the packageJson property to the package.json file on disk.

#### Returns

`Promise`\<`void`\>

***

### toString()

```ts
toString(): string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:455](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L455)

Returns a string representation of an object.

#### Returns

`string`

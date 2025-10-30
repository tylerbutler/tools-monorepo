[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IReleaseGroup

# Interface: IReleaseGroup

Defined in: packages/sail-infrastructure/src/types.ts:235

A release group is a collection of packages that are versioned and released together. All packages within a release
group will have the same version, and all packages will be released at the same time.

Release groups are not involved in dependency management. They are used for versioning and releasing packages only.
Workspaces, on the other hand, are used to manage dependencies and interdependencies. See [IWorkspace](IWorkspace.md) for more
information.

## Extends

- [`Reloadable`](Reloadable.md)

## Properties

### adoPipelineUrl?

```ts
readonly optional adoPipelineUrl: string;
```

Defined in: packages/sail-infrastructure/src/types.ts:271

An optional ADO pipeline URL for the CI pipeline that builds the release group.

***

### name

```ts
readonly name: ReleaseGroupName;
```

Defined in: packages/sail-infrastructure/src/types.ts:239

The name of the release group. All release groups must have unique names.

***

### packages

```ts
readonly packages: IPackage<PackageJson>[];
```

Defined in: packages/sail-infrastructure/src/types.ts:254

An array of all packages in the release group.

***

### releaseGroupDependencies

```ts
readonly releaseGroupDependencies: IReleaseGroup[];
```

Defined in: packages/sail-infrastructure/src/types.ts:266

An array of all the release groups that the release group depends on. If any package in a release group has any
dependency on a package in another release group within the same workspace, then the first release group depends
on the second.

***

### rootPackage?

```ts
readonly optional rootPackage: IPackage<PackageJson>;
```

Defined in: packages/sail-infrastructure/src/types.ts:249

The package that is the release group root, if one exists.

***

### version

```ts
readonly version: string;
```

Defined in: packages/sail-infrastructure/src/types.ts:244

The version of the release group.

***

### workspace

```ts
readonly workspace: IWorkspace;
```

Defined in: packages/sail-infrastructure/src/types.ts:259

The workspace that the release group belongs to.

## Methods

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

***

### toString()

```ts
toString(): string;
```

Defined in: packages/sail-infrastructure/src/types.ts:273

Returns a string representation of an object.

#### Returns

`string`

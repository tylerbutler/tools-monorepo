[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / Installable

# Interface: Installable

Defined in: [packages/sail-infrastructure/src/types.ts:128](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/types.ts#L128)

A common interface for installable things, like packages, release groups, and workspaces.

## Extended by

- [`IPackage`](IPackage.md)
- [`IWorkspace`](IWorkspace.md)

## Methods

### checkInstall()

```ts
checkInstall(): Promise<true | string[]>;
```

Defined in: [packages/sail-infrastructure/src/types.ts:132](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/types.ts#L132)

Returns `true` if the item is installed. If the item is not installed, an array of error strings will be returned.

#### Returns

`Promise`\<`true` \| `string`[]\>

***

### install()

```ts
install(updateLockfile): Promise<boolean>;
```

Defined in: [packages/sail-infrastructure/src/types.ts:142](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/types.ts#L142)

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

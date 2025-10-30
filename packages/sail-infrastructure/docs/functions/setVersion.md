[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / setVersion

# Function: setVersion()

```ts
function setVersion<J>(packages, version): Promise<void>;
```

Defined in: packages/sail-infrastructure/src/versions.ts:18

Sets the version of a group of packages, writing the new version in package.json. After the update, the packages are
reloaded so the in-memory data reflects the version changes.

## Type Parameters

### J

`J` *extends* [`PackageJson`](../type-aliases/PackageJson.md)

## Parameters

### packages

[`IPackage`](../interfaces/IPackage.md)\<`J`\>[]

An array of objects whose version should be updated.

### version

`SemVer`

The version to set.

## Returns

`Promise`\<`void`\>

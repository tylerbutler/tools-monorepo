[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / updatePackageJsonFile

# Function: updatePackageJsonFile()

```ts
function updatePackageJsonFile<J>(packagePath, packageTransformer): void;
```

Defined in: [packages/sail-infrastructure/src/packageJsonUtils.ts:27](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/packageJsonUtils.ts#L27)

Reads the contents of package.json, applies a transform function to it, then writes the results back to the source
file.

## Type Parameters

### J

`J` *extends* [`PackageJson`](../type-aliases/PackageJson.md) = [`PackageJson`](../type-aliases/PackageJson.md)

## Parameters

### packagePath

`string`

A path to a package.json file or a folder containing one. If the path is a directory, the
package.json from that directory will be used.

### packageTransformer

(`json`) => `void`

A function that will be executed on the package.json contents before writing it
back to the file.

## Returns

`void`

## Remarks

The package.json is always sorted using sort-package-json.

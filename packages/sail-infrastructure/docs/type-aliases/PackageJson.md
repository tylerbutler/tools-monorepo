[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PackageJson

# Type Alias: PackageJson

```ts
type PackageJson = SetRequired<Pick<StandardPackageJson, 
  | "name"
  | "scripts"
  | "version"
  | "dependencies"
  | "devDependencies"
  | "peerDependencies"
  | "private"
  | "type">, "name" | "scripts" | "version"> & PnpmPackageJsonFields;
```

Defined in: [packages/sail-infrastructure/src/types.ts:29](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L29)

All known package.json fields including those that are specific to build-infrastructure.
The `name`, `scripts`, and `version` fields are required, unlike standard package.json.

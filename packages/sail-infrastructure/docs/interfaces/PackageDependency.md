[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PackageDependency

# Interface: PackageDependency

Defined in: [packages/sail-infrastructure/src/types.ts:339](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L339)

Information about a package dependency. That is, en extry in the "dependencies", "devDependencies", or
"peerDependencies" fields in package.json.

## Properties

### depKind

```ts
depKind: "prod" | "dev" | "peer";
```

Defined in: [packages/sail-infrastructure/src/types.ts:357](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L357)

The kind of dependency, based on the field that the dependency comes from.

- prod corresponds to the dependencies field.
- dev corresponds to the devDependencies field.
- peer corresponds to the peerDependencies field.

***

### name

```ts
name: PackageName;
```

Defined in: [packages/sail-infrastructure/src/types.ts:343](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L343)

The name of the dependency.

***

### version

```ts
version: string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:348](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L348)

The version or version range of the dependency.

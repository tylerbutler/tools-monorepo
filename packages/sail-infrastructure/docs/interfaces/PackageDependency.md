[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PackageDependency

# Interface: PackageDependency

Defined in: [packages/sail-infrastructure/src/types.ts:344](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/types.ts#L344)

Information about a package dependency. That is, en extry in the "dependencies", "devDependencies", or
"peerDependencies" fields in package.json.

## Properties

### depKind

```ts
depKind: "prod" | "dev" | "peer";
```

Defined in: [packages/sail-infrastructure/src/types.ts:362](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/types.ts#L362)

The kind of dependency, based on the field that the dependency comes from.

- prod corresponds to the dependencies field.
- dev corresponds to the devDependencies field.
- peer corresponds to the peerDependencies field.

***

### name

```ts
name: PackageName;
```

Defined in: [packages/sail-infrastructure/src/types.ts:348](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/types.ts#L348)

The name of the dependency.

***

### version

```ts
version: string;
```

Defined in: [packages/sail-infrastructure/src/types.ts:353](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/types.ts#L353)

The version or version range of the dependency.

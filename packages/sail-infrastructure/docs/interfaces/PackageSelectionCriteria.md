[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PackageSelectionCriteria

# Interface: PackageSelectionCriteria

Defined in: [packages/sail-infrastructure/src/filter.ts:18](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L18)

The criteria that should be used for selecting package-like objects from a collection.

## Properties

### changedSinceBranch?

```ts
optional changedSinceBranch: string;
```

Defined in: [packages/sail-infrastructure/src/filter.ts:68](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L68)

If set, only selects packages that have changes when compared with the branch of this name.

***

### directory?

```ts
optional directory: string;
```

Defined in: [packages/sail-infrastructure/src/filter.ts:63](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L63)

If set, only selects the single package in this directory.

***

### releaseGroupRoots

```ts
releaseGroupRoots: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:58](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L58)

An array of release groups whose root packages are selected. Only the roots of each release group will be included.
Rootless release groups will never be selected with this criteria.

The reserved string "\*" will select all packages when included in one of the criteria. If used, the "\*" value is
expected to be the only item in the selection array.

***

### releaseGroups

```ts
releaseGroups: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:49](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L49)

An array of release groups whose packages are selected. All packages in the release group _except_ the root package
will be selected. To include release group roots, use the `releaseGroupRoots` property.

Values should either be complete release group names or micromatch glob strings. To select all release groups, use
`"*"`. See https://www.npmjs.com/package/micromatch?activeTab=readme#extended-globbing for more details.

Workspace names will be compared against all globs - if any match, the workspace will be selected.

***

### workspaceRoots

```ts
workspaceRoots: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:38](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L38)

An array of workspaces whose root packages are selected. Only the roots of each workspace will be included.

Values should either be complete workspace names or micromatch glob strings. To select all workspaces, use `"*"`.
See https://www.npmjs.com/package/micromatch?activeTab=readme#extended-globbing for more details.

Workspace names will be compared against all globs - if any match, the workspace will be selected.

***

### workspaces

```ts
workspaces: string[];
```

Defined in: [packages/sail-infrastructure/src/filter.ts:28](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/filter.ts#L28)

An array of workspaces whose packages are selected. All packages in the workspace _except_ the root package
will be selected. To include workspace roots, use the `workspaceRoots` property.

Values should either be complete workspace names or micromatch glob strings. To select all workspaces, use `"*"`.
See https://www.npmjs.com/package/micromatch?activeTab=readme#extended-globbing for more details.

Workspace names will be compared against all globs - if any match, the workspace will be selected.

[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / WorkspaceDefinition

# Interface: WorkspaceDefinition

Defined in: [packages/sail-infrastructure/src/config.ts:101](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L101)

The definition of a workspace in configuration.

## Properties

### directory

```ts
directory: string;
```

Defined in: [packages/sail-infrastructure/src/config.ts:105](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L105)

The root directory of the workspace. This folder should contain a workspace config file (e.g. pnpm-workspace.yaml).

***

### releaseGroups

```ts
releaseGroups: object;
```

Defined in: [packages/sail-infrastructure/src/config.ts:110](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L110)

Definitions of the release groups within the workspace.

#### Index Signature

```ts
[name: string]: ReleaseGroupDefinition
```

A mapping of release group name to a definition for the release group.

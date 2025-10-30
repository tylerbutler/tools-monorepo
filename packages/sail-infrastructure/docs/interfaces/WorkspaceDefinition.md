[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / WorkspaceDefinition

# Interface: WorkspaceDefinition

Defined in: packages/sail-infrastructure/src/config.ts:103

The definition of a workspace in configuration.

## Properties

### directory

```ts
directory: string;
```

Defined in: packages/sail-infrastructure/src/config.ts:107

The root directory of the workspace. This folder should contain a workspace config file (e.g. pnpm-workspace.yaml).

***

### releaseGroups

```ts
releaseGroups: object;
```

Defined in: packages/sail-infrastructure/src/config.ts:112

Definitions of the release groups within the workspace.

#### Index Signature

```ts
[name: string]: ReleaseGroupDefinition
```

A mapping of release group name to a definition for the release group.

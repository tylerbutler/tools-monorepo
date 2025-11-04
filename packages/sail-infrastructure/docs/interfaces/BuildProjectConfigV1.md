[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / BuildProjectConfigV1

# Interface: BuildProjectConfigV1

Defined in: [packages/sail-infrastructure/src/config.ts:39](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L39)

## Extends

- `BuildProjectConfigBase`

## Properties

### buildProject?

```ts
optional buildProject: object;
```

Defined in: [packages/sail-infrastructure/src/config.ts:29](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L29)

The layout of the build project into workspaces and release groups.

#### workspaces

```ts
workspaces: object;
```

##### Index Signature

```ts
[name: string]: WorkspaceDefinition
```

A mapping of workspace name to folder containing a workspace config file (e.g. pnpm-workspace.yaml).

#### Inherited from

```ts
BuildProjectConfigBase.buildProject
```

***

### ~~repoPackages?~~

```ts
optional repoPackages: IFluidBuildDirs;
```

Defined in: [packages/sail-infrastructure/src/config.ts:52](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L52)

**BACK-COMPAT ONLY**

A mapping of package or release group names to metadata about the package or release group.

#### Deprecated

Use the buildProject property instead.

***

### version

```ts
version: 1;
```

Defined in: [packages/sail-infrastructure/src/config.ts:43](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L43)

The version of the config.

#### Overrides

```ts
BuildProjectConfigBase.version
```

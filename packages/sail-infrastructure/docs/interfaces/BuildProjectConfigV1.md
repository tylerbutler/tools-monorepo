[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / BuildProjectConfigV1

# Interface: BuildProjectConfigV1

Defined in: [packages/sail-infrastructure/src/config.ts:40](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L40)

## Extends

- `BuildProjectConfigBase`

## Properties

### buildProject?

```ts
optional buildProject: object;
```

Defined in: [packages/sail-infrastructure/src/config.ts:30](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L30)

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

Defined in: [packages/sail-infrastructure/src/config.ts:53](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L53)

**BACK-COMPAT ONLY**

A mapping of package or release group names to metadata about the package or release group.

#### Deprecated

Use the buildProject property instead.

***

### version

```ts
version: 1;
```

Defined in: [packages/sail-infrastructure/src/config.ts:44](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L44)

The version of the config.

#### Overrides

```ts
BuildProjectConfigBase.version
```

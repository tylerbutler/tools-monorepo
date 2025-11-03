[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / ReleaseGroupDefinition

# Interface: ReleaseGroupDefinition

Defined in: [packages/sail-infrastructure/src/config.ts:121](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L121)

The definition of a release group ih configuration.

## Properties

### adoPipelineUrl?

```ts
optional adoPipelineUrl: string;
```

Defined in: [packages/sail-infrastructure/src/config.ts:151](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L151)

A URL to the ADO CI pipeline that builds the release group.

***

### exclude?

```ts
optional exclude: string[];
```

Defined in: [packages/sail-infrastructure/src/config.ts:134](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L134)

An array of scopes or package names that should be excluded. Exclusions are applied AFTER inclusions, so
this can be used to exclude specific packages in a certain scope.

***

### include

```ts
include: string[];
```

Defined in: [packages/sail-infrastructure/src/config.ts:128](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L128)

An array of scopes or package names that should be included in the release group. Each package must
belong to a single release group.

To include all packages, set this value to a single element: `["*"]`.

***

### rootPackageName?

```ts
optional rootPackageName: string;
```

Defined in: [packages/sail-infrastructure/src/config.ts:146](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L146)

The name of the package that should be considered the root package for the release group. If not provided, the
release group is considered "rootless."

#### Remarks

A release group may have a "root package" that is part of the workspace but fills a similar role to the
workspace-root package: it is a convenient place to store release-group-wide scripts as opposed to workspace-wide
scripts.

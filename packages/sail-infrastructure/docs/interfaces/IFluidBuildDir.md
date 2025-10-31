[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IFluidBuildDir

# ~~Interface: IFluidBuildDir~~

Defined in: [packages/sail-infrastructure/src/config.ts:174](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L174)

Configures a package or release group

## Deprecated

Use buildProject and associated types instead.

## Properties

### ~~directory~~

```ts
directory: string;
```

Defined in: [packages/sail-infrastructure/src/config.ts:178](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L178)

The path to the package. For release groups this should be the path to the root of the release group.

***

### ~~ignoredDirs?~~

```ts
optional ignoredDirs: string[];
```

Defined in: [packages/sail-infrastructure/src/config.ts:185](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/config.ts#L185)

An array of paths under `directory` that should be ignored.

#### Deprecated

This field is unused in all known configs and is ignored by the back-compat loading code.

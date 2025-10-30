[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IFluidBuildDir

# ~~Interface: IFluidBuildDir~~

Defined in: [packages/sail-infrastructure/src/config.ts:168](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/config.ts#L168)

Configures a package or release group

## Deprecated

Use buildProject and associated types instead.

## Properties

### ~~directory~~

```ts
directory: string;
```

Defined in: [packages/sail-infrastructure/src/config.ts:172](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/config.ts#L172)

The path to the package. For release groups this should be the path to the root of the release group.

***

### ~~ignoredDirs?~~

```ts
optional ignoredDirs: string[];
```

Defined in: [packages/sail-infrastructure/src/config.ts:179](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/config.ts#L179)

An array of paths under `directory` that should be ignored.

#### Deprecated

This field is unused in all known configs and is ignored by the back-compat loading code.

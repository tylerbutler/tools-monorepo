[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IFluidBuildDir

# ~~Interface: IFluidBuildDir~~

Defined in: [packages/sail-infrastructure/src/config.ts:173](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/config.ts#L173)

Configures a package or release group

## Deprecated

Use buildProject and associated types instead.

## Properties

### ~~directory~~

```ts
directory: string;
```

Defined in: [packages/sail-infrastructure/src/config.ts:177](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/config.ts#L177)

The path to the package. For release groups this should be the path to the root of the release group.

***

### ~~ignoredDirs?~~

```ts
optional ignoredDirs: string[];
```

Defined in: [packages/sail-infrastructure/src/config.ts:184](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/config.ts#L184)

An array of paths under `directory` that should be ignored.

#### Deprecated

This field is unused in all known configs and is ignored by the back-compat loading code.

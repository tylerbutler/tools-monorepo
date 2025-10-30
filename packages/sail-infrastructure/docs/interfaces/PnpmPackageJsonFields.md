[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / PnpmPackageJsonFields

# Interface: PnpmPackageJsonFields

Defined in: [packages/sail-infrastructure/src/types.ts:11](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L11)

Extra package.json fields used by pnpm.
See [https://pnpm.io/package\_json](https://pnpm.io/package_json).

## Properties

### pnpm?

```ts
optional pnpm: object;
```

Defined in: [packages/sail-infrastructure/src/types.ts:16](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L16)

Configuration for pnpm.
See [https://pnpm.io/package\_json](https://pnpm.io/package_json).

#### overrides?

```ts
optional overrides: Record<string, string>;
```

Instruct pnpm to override any dependency in the dependency graph.
See [https://pnpm.io/package\_json#pnpmoverrides](https://pnpm.io/package_json#pnpmoverrides)

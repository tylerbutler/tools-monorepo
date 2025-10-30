[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / IPackageManager

# Interface: IPackageManager

Defined in: [packages/sail-infrastructure/src/types.ts:312](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L312)

A package manager, such as "npm" or "pnpm".

## Properties

### lockfileNames

```ts
readonly lockfileNames: string[];
```

Defined in: [packages/sail-infrastructure/src/types.ts:321](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L321)

The name of the lockfile(s) used by the package manager.

***

### name

```ts
readonly name: AgentName;
```

Defined in: [packages/sail-infrastructure/src/types.ts:316](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L316)

The name of the package manager.

## Methods

### getInstallCommandWithArgs()

```ts
getInstallCommandWithArgs(updateLockfile): string[];
```

Defined in: [packages/sail-infrastructure/src/types.ts:337](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/types.ts#L337)

Returns an array of arguments, including the name of the command, e.g. "install", that can be used to install
dependencies using this package manager.

#### Parameters

##### updateLockfile

`boolean`

If `true`, then the returned command will include flags or arguments necessary to update
the lockfile during install. If `false`, such flags or arguments should be omitted. Note that the command will
_not_ include the package manager name istself. For example, the `npm` package manager will return `["install"]`,
not `["npm", "install"]`.

#### Returns

`string`[]

#### Example

```ts
For the pnpm package manager, calling `getInstallCommandWithArgs(true)` would return
`["install", "--no-frozen-lockfile"]`.
```

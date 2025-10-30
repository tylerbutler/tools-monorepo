[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / generateBuildProjectConfig

# Function: generateBuildProjectConfig()

```ts
function generateBuildProjectConfig(searchPath): _RequireExactlyOne;
```

Defined in: [packages/sail-infrastructure/src/buildProject.ts:234](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/buildProject.ts#L234)

Generates a BuildProjectConfig by searching searchPath and below for workspaces. If any workspaces are found, they're
automatically added to the config, and a single release group is created within the workspace. Both the workspace and
the release group will be named the "basename" of the workspace path.

Generated configs use the latest config version.

## Parameters

### searchPath

`string`

## Returns

`_RequireExactlyOne`

[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / getBuildProjectConfig

# Function: getBuildProjectConfig()

```ts
function getBuildProjectConfig(searchPath, noCache): object;
```

Defined in: packages/sail-infrastructure/src/config.ts:268

Search a path for a build project config file, and return the parsed config and the path to the config file.

## Parameters

### searchPath

`string`

The path to start searching for config files in.

### noCache

`boolean` = `false`

If true, the config cache will be cleared and the config will be reloaded.

## Returns

`object`

The loaded build project config and the path to the config file.

### config

```ts
config: BuildProjectConfig;
```

### configFilePath

```ts
configFilePath: string;
```

## Throws

If a config is not found or if the config version is not supported.

# @tylerbu/cli-api

## 0.3.0

### Minor Changes

- f54b0e7: New feature: base classes that automatically load config

  cli-api now provides the following base classes for commands:

  ```ts
  // A base command that loads typed configuration values from a config file.
  // The generic type parameter `C` is the type of the config that the command uses.
  export abstract class CommandWithConfig<T extends typeof Command & {
      args: typeof CommandWithConfig.arguments;
      flags: typeof CommandWithConfig.flags;
  }, C = unknown> extends BaseCommand<T>

  // A base command that has no config.
  export abstract class CommandWithoutConfig<T extends typeof Command & {
      args: typeof CommandWithoutConfig.arguments;
      flags: typeof CommandWithoutConfig.flags;
  }> extends BaseCommand<T>

  // A base command for commands that are intended to be used in a Git repository.
  // These commands have `git` and `repo` properties that are initialized automatically when the
  // command runs.
  // These commands can also have optional configuration by providing a configuration type.
  export abstract class GitCommand<T extends typeof Command & {
      args: typeof GitCommand.arguments;
      flags: typeof GitCommand.flags;
  }, C = undefined> extends CommandWithConfig<T, C>
  ```

- b60f2ed: New feature: tsconfig sorting APIs

  cli-api now provides the following exported APIs and supporting types:

  ```ts
  // Checks if a tsconfig file is sorted.
  export function isSorted(tsconfig: string): boolean;

  // Sorts a file in place. The sorted contents is always returned; use `write: true` to write file.
  export function sortTsconfigFile(
    tsconfigPath: string,
    write: boolean
  ): SortTsconfigResult;

  // Result of a tsconfig sort operation.
  export interface SortTsconfigResult {
    // Will be `true` if the file was already sorted.
    alreadySorted: boolean;
    // The sorted tsconfig string.
    tsconfig: string;
  }
  ```

## 0.2.0

### Minor Changes

- 7b43351: Move reusable CLI infrastructure to new @tylerbu/cli-api package.

### Patch Changes

- 1d28e74: Upgrade oclif dependencies to latest version

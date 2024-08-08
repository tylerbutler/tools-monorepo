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

## 0.2.0

### Minor Changes

- 7b43351: Move reusable CLI infrastructure to new @tylerbu/cli-api package.

### Patch Changes

- 1d28e74: Upgrade oclif dependencies to latest version

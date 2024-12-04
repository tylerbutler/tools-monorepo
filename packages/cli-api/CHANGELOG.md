# @tylerbu/cli-api

## 0.6.0

### Minor Changes

- New context and git-related command interfaces _[`#150`](https://github.com/tylerbutler/tools-monorepo/pull/150) [`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137) [@tylerbutler](https://github.com/tylerbutler)_

  The new `CommandWithContext<CONTEXT>` interface can be implemented by commands that use a context object.

  The `RequiresGit` interface can be implemented by commands that require a Git repository in order to run.

- Deprecated: CommandWithoutConfig _[`#150`](https://github.com/tylerbutler/tools-monorepo/pull/150) [`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137) [@tylerbutler](https://github.com/tylerbutler)_

  The CommandWithoutConfig class was superfluous and has been deprecated. Use the BaseCommand class directly instead.

## 0.5.0

### Minor Changes

- Update CommandWithConfig typing _[`#136`](https://github.com/tylerbutler/tools-monorepo/pull/136) [`f803610`](https://github.com/tylerbutler/tools-monorepo/commit/f803610f64936c5d49d862b2f4240ea248fe3f76) [@tylerbutler](https://github.com/tylerbutler)_

  - The `loadConfig` method now takes a reload parameter.
  - The `defaultConfig` method has been removed.

## 0.4.0

### Minor Changes

- Functions for processing JSON _[`#116`](https://github.com/tylerbutler/tools-monorepo/pull/116) [`cbdec3f`](https://github.com/tylerbutler/tools-monorepo/commit/cbdec3f7b3daa4ec642b44a5de046fff8420f15a) [@tylerbutler](https://github.com/tylerbutler)_

  The following functions are now available to work with JSON files:

  ```ts
  export function readJsonWithIndent(filePath: PathLike): Promise<{
    json: unknown;
    indent: Indent;
  }>;

  export function updatePackageJsonFile<T extends PackageJson = PackageJson>(
    packagePath: string,
    packageTransformer: PackageTransformer,
    options?: JsonWriteOptions,
  ): Promise<void>;
  ```

- Add custom flag for config files _[`#112`](https://github.com/tylerbutler/tools-monorepo/pull/112) [`d55c982`](https://github.com/tylerbutler/tools-monorepo/commit/d55c982f960b56a79f0e0d35dd9102a25882032f) [@tylerbutler](https://github.com/tylerbutler)_

  The `ConfigFileFlag` flag can be used with `CommandWithConfig` subclasses to enable passing a specific path to a config
  file.

## 0.3.1

### Patch Changes

- Fix homepage URL _[`#99`](https://github.com/tylerbutler/tools-monorepo/pull/99) [`0654323`](https://github.com/tylerbutler/tools-monorepo/commit/06543231947fa5267863e5467d5837a51cf3d44b) [@tylerbutler](https://github.com/tylerbutler)_

## 0.3.0

### Minor Changes

- New feature: base classes that automatically load config _[`#15`](https://github.com/tylerbutler/tools-monorepo/pull/15) [`f54b0e7`](https://github.com/tylerbutler/tools-monorepo/commit/f54b0e71dd1d54c5e3730b7a1f1ab1a53b9b7943) [@tylerbutler](https://github.com/tylerbutler)_

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

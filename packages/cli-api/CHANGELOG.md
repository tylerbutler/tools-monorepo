# @tylerbu/cli-api

## 0.7.2

### Patch Changes

- Update package metadata _[`#221`](https://github.com/tylerbutler/tools-monorepo/pull/221) [`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 1 dependency</summary>

<small>

[`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd)

</small>

- `@tylerbu/lilconfig-loader-ts@0.1.2`

</details>

## 0.7.1

### Patch Changes

- Update dependencies _[`#217`](https://github.com/tylerbutler/tools-monorepo/pull/217) [`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 1 dependency</summary>

<small>

[`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d)

</small>

- `@tylerbu/lilconfig-loader-ts@0.1.1`

</details>

## 0.7.0

### Minor Changes

- API changes _[`#157`](https://github.com/tylerbutler/tools-monorepo/pull/157) [`ede1957`](https://github.com/tylerbutler/tools-monorepo/commit/ede19579ffc630f6e176046c6e11e170849a0d48) [@tylerbutler](https://github.com/tylerbutler)_

  - **Breaking change:** `CommandWithConfig.configPath` is now `CommandWithConfig.configLocation`.
  - `PackageTransformer`s can now be async.
  - `readJsonWithIndent` is now generic.

- Remove deprecated CommandWithoutConfig class _[`#173`](https://github.com/tylerbutler/tools-monorepo/pull/173) [`33b9c01`](https://github.com/tylerbutler/tools-monorepo/commit/33b9c01ed2d5d0c4bdb32262f549531650c48ad0) [@tylerbutler](https://github.com/tylerbutler)_
- Improve cross-platform path handling _[`#176`](https://github.com/tylerbutler/tools-monorepo/pull/176) [`2d095c7`](https://github.com/tylerbutler/tools-monorepo/commit/2d095c7828037fc58147d0aa487b736dbd345472) [@tylerbutler](https://github.com/tylerbutler)_

### Patch Changes

- Load default config if provided _[`#175`](https://github.com/tylerbutler/tools-monorepo/pull/175) [`a4b7624`](https://github.com/tylerbutler/tools-monorepo/commit/a4b7624cceea2f7246391c2d54329010cbb145ff) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 1 dependency</summary>

<small>

[`cd3686c`](https://github.com/tylerbutler/tools-monorepo/commit/cd3686c02458d7a9f8f01e8d7e1a615c98f75e1d)

</small>

- `@tylerbu/lilconfig-loader-ts@0.1.0`

</details>

## 0.6.1

### Patch Changes

- Add missing sort-package-json dependency _[`#167`](https://github.com/tylerbutler/tools-monorepo/pull/167) [`7406bbf`](https://github.com/tylerbutler/tools-monorepo/commit/7406bbf1131028058178d53f4e64564660c4d495) [@ic4l4s9c](https://github.com/ic4l4s9c)_

  Thanks to [@ic4l4s9c](https://github.com/ic4l4s9c) for this fix!

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

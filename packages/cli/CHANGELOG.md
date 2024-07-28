# @tylerbu/cli

## 0.3.0

### Minor Changes

- 13a0796: Add version command

  The `version` command can be used to get detailed version information about the command. This command is implemented by
  [@oclif/plugin-version](https://github.com/oclif/plugin-version).

- bdfb063: New command: `tbu sort:tsconfig`

  The `sort:tsconfig` command sorts a tsconfig file in place or checks that one is sorted.

  See [the 'sort:tsconfig'
  documentation](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/docs/sort.md) for detailed information.

- dac542b: Add download command

  The `download` command can be used to download files and optionally decompress their contents. This command is
  implemented by [dill](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/).

- 13a0796: Add which command

  The `which` command can be used to find which plugin a command is in. This command is implemented by
  [@oclif/plugin-which](https://github.com/oclif/plugin-which).

- b60f2ed: Add search command

  The `search` command can be used to find other commands and display their help. This command is implemented by
  [@oclif/plugin-search](https://github.com/oclif/plugin-search).

### Patch Changes

- Updated dependencies [f54b0e7]
- Updated dependencies [b60f2ed]
- Updated dependencies [dac542b]
  - @tylerbu/cli-api@0.3.0
  - dill@0.1.0

## 0.2.1

### Patch Changes

- 6ac08e1: Republish broken package.

## 0.2.0

### Minor Changes

- 7b43351: Move reusable CLI infrastructure to new @tylerbu/cli-api package.

### Patch Changes

- 1d28e74: Upgrade oclif dependencies to latest version
- Updated dependencies [1d28e74]
- Updated dependencies [7b43351]
  - @tylerbu/cli-api@0.2.0

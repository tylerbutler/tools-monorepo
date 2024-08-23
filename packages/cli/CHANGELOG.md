# @tylerbu/cli

## 0.3.0

### Minor Changes

- New commands 'version' and 'which' _[`#11`](https://github.com/tylerbutler/tools-monorepo/pull/11) [`13a0796`](https://github.com/tylerbutler/tools-monorepo/commit/13a07966374b4830b646e6aa7b197a60fa1703f5) [@tylerbutler](https://github.com/tylerbutler)_

  The `version` command can be used to get detailed version information about the command. This command is implemented by
  [@oclif/plugin-version](https://github.com/oclif/plugin-version).

  The `which` command can be used to find which plugin a command is in. This command is implemented by
  [@oclif/plugin-which](https://github.com/oclif/plugin-which).

- New command 'sort:tsconfig' _[`#7`](https://github.com/tylerbutler/tools-monorepo/pull/7) [`bdfb063`](https://github.com/tylerbutler/tools-monorepo/commit/bdfb063d89da215131a0faa3672330d861fe993b) [@tylerbutler](https://github.com/tylerbutler)_

  The `sort:tsconfig` command sorts a tsconfig file in place or checks that one is sorted.

  See [the 'sort:tsconfig'
  documentation](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/docs/sort.md) for detailed information.

- Add download command _[`#8`](https://github.com/tylerbutler/tools-monorepo/pull/8) [`dac542b`](https://github.com/tylerbutler/tools-monorepo/commit/dac542b02484b11a16f2efc8a1e6dd02dcb2b611) [@tylerbutler](https://github.com/tylerbutler)_

  The `download` command can be used to download files and optionally decompress their contents. This command is
  implemented by [dill](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/).

- Add search command _[`b60f2ed`](https://github.com/tylerbutler/tools-monorepo/commit/b60f2edd82a62744cfa85f6d198110b25a660544) [@tylerbutler](https://github.com/tylerbutler)_

  The `search` command can be used to find other commands and display their help. This command is implemented by
  [@oclif/plugin-search](https://github.com/oclif/plugin-search).

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`f54b0e7`](https://github.com/tylerbutler/tools-monorepo/commit/f54b0e71dd1d54c5e3730b7a1f1ab1a53b9b7943) [`dac542b`](https://github.com/tylerbutler/tools-monorepo/commit/dac542b02484b11a16f2efc8a1e6dd02dcb2b611)

</small>

- `@tylerbu/cli-api@0.3.0`
- `dill-cli@0.1.0`

</details>

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

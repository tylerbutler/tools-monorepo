# @tylerbu/cli

## 0.5.0

### Minor Changes

- Add `fluid task-rename` command for FluidFramework repository _[`#326`](https://github.com/tylerbutler/tools-monorepo/pull/326) [`bcbee7d`](https://github.com/tylerbutler/tools-monorepo/commit/bcbee7da2d54616abc1cb1b3d16b0ded6edb632d) [@tylerbutler](https://github.com/tylerbutler)_

  **New Command:**

  - `tbu fluid task-rename` - Rename package.json scripts to follow three-tier naming principles

  **Features:**

  - Analyze and validate script naming across all packages
  - Apply systematic renames with cross-reference updates
  - Dry-run mode to preview changes before applying
  - Validation-only mode to check for naming issues

## 0.4.1

### Patch Changes

- Add missing template files to package _[`#324`](https://github.com/tylerbutler/tools-monorepo/pull/324) [`cc72e15`](https://github.com/tylerbutler/tools-monorepo/commit/cc72e156f12de4f502c05a57eeee44d05195ff17) [@tylerbutler](https://github.com/tylerbutler)_

## 0.4.0

### Minor Changes

- New fluid repo-overlay command _[`#322`](https://github.com/tylerbutler/tools-monorepo/pull/322) [`11becec`](https://github.com/tylerbutler/tools-monorepo/commit/11becec23780fb58dcd854e3e910e725864177e4) [@tylerbutler](https://github.com/tylerbutler)_

  Add `fluid repo-overlay` command to apply Nx or Turbo build configurations to the FluidFramework repository. The command supports dry-run mode to preview changes before applying them, and can update configuration files, package.json files, and .gitignore entries as needed.

### Patch Changes

- Fix git squish command configuration loading _[`#320`](https://github.com/tylerbutler/tools-monorepo/pull/320) [`0028315`](https://github.com/tylerbutler/tools-monorepo/commit/002831523cc6483c79c217dc3e8026ccf2def98e) [@tylerbutler](https://github.com/tylerbutler)_

  - **cli-api**: Add `requiresConfig` property to `CommandWithConfig` to allow commands to skip config loading
  - **cli-api**: Set `GitCommand.requiresConfig = false` by default since git commands typically don't need config files

  This fixes the "Failure to load config" error that occurred when running git commands in directories without a config file.

<details><summary>Updated 2 dependencies</summary>

<small>

[`0028315`](https://github.com/tylerbutler/tools-monorepo/commit/002831523cc6483c79c217dc3e8026ccf2def98e) [`39f8132`](https://github.com/tylerbutler/tools-monorepo/commit/39f81320a5245759b9a797105ac5ffe3caf996f9)

</small>

- `@tylerbu/cli-api@0.7.3`
- `dill-cli@0.3.1`

</details>

## 0.3.8

### Patch Changes

- Update package metadata _[`#221`](https://github.com/tylerbutler/tools-monorepo/pull/221) [`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 2 dependencies</summary>

<small>

[`2ce5817`](https://github.com/tylerbutler/tools-monorepo/commit/2ce5817daa2c7ee27f9ce42833c497155ab6b59a) [`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd) [`4746ecc`](https://github.com/tylerbutler/tools-monorepo/commit/4746ecc3ca57dca44f65452fecf227cb242b90e4)

</small>

- `dill-cli@0.3.0`
- `@tylerbu/cli-api@0.7.2`

</details>

## 0.3.7

### Patch Changes

- Update dependencies _[`#217`](https://github.com/tylerbutler/tools-monorepo/pull/217) [`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 2 dependencies</summary>

<small>

[`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d)

</small>

- `@tylerbu/cli-api@0.7.1`
- `dill-cli@0.2.1`

</details>

## 0.3.6

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`a4b7624`](https://github.com/tylerbutler/tools-monorepo/commit/a4b7624cceea2f7246391c2d54329010cbb145ff) [`ede1957`](https://github.com/tylerbutler/tools-monorepo/commit/ede19579ffc630f6e176046c6e11e170849a0d48) [`33b9c01`](https://github.com/tylerbutler/tools-monorepo/commit/33b9c01ed2d5d0c4bdb32262f549531650c48ad0) [`2d095c7`](https://github.com/tylerbutler/tools-monorepo/commit/2d095c7828037fc58147d0aa487b736dbd345472)

</small>

- `@tylerbu/cli-api@0.7.0`
- `dill-cli@0.2.0`

</details>

## 0.3.5

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`7406bbf`](https://github.com/tylerbutler/tools-monorepo/commit/7406bbf1131028058178d53f4e64564660c4d495)

</small>

- `@tylerbu/cli-api@0.6.1`
- `dill-cli@0.1.5`

</details>

## 0.3.4

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137) [`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137)

</small>

- `@tylerbu/cli-api@0.6.0`
- `dill-cli@0.1.4`

</details>

## 0.3.3

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`f803610`](https://github.com/tylerbutler/tools-monorepo/commit/f803610f64936c5d49d862b2f4240ea248fe3f76)

</small>

- `@tylerbu/cli-api@0.5.0`
- `dill-cli@0.1.3`

</details>

## 0.3.2

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`cbdec3f`](https://github.com/tylerbutler/tools-monorepo/commit/cbdec3f7b3daa4ec642b44a5de046fff8420f15a) [`d55c982`](https://github.com/tylerbutler/tools-monorepo/commit/d55c982f960b56a79f0e0d35dd9102a25882032f)

</small>

- `@tylerbu/cli-api@0.4.0`
- `dill-cli@0.1.2`

</details>

## 0.3.1

### Patch Changes

- Fix homepage URL _[`#99`](https://github.com/tylerbutler/tools-monorepo/pull/99) [`0654323`](https://github.com/tylerbutler/tools-monorepo/commit/06543231947fa5267863e5467d5837a51cf3d44b) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 2 dependencies</summary>

<small>

[`0654323`](https://github.com/tylerbutler/tools-monorepo/commit/06543231947fa5267863e5467d5837a51cf3d44b)

</small>

- `@tylerbu/cli-api@0.3.1`
- `dill-cli@0.1.1`

</details>

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
  implemented by [dill](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill-cli/).

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

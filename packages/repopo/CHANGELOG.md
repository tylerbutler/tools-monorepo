# repopo

## 0.6.0

### Minor Changes

- Configuration changes _[`#224`](https://github.com/tylerbutler/tools-monorepo/pull/224) [`2b7db34`](https://github.com/tylerbutler/tools-monorepo/commit/2b7db343d74ab2e518ab2f232f47ea365ca784b8) [@tylerbutler](https://github.com/tylerbutler)_

  The configuration for repopo has changed a lot in this release. The goal is to improve the typing of config and make it
  easier to configure things in one place.

  Policies are now declared as `PolicyDefinition`, and are then combined with a configuration (if the policy has
  configuration) using `makePolicy` to form a `PolicyInstance`, which is the primary type used internally.

  Generators now generate `PolicyDefinition`s, and can be used directly inline with `makePolicy`.

- Export policies from /policies entrypoint only _[`#224`](https://github.com/tylerbutler/tools-monorepo/pull/224) [`2b7db34`](https://github.com/tylerbutler/tools-monorepo/commit/2b7db343d74ab2e518ab2f232f47ea365ca784b8) [@tylerbutler](https://github.com/tylerbutler)_

  Policies included with repopo are now exported from `repopo/policies`.

### Patch Changes

- Update package metadata _[`#221`](https://github.com/tylerbutler/tools-monorepo/pull/221) [`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 2 dependencies</summary>

<small>

[`9e5225a`](https://github.com/tylerbutler/tools-monorepo/commit/9e5225abfb67af1575af13dff60830d8da28eafd)

</small>

- `@tylerbu/fundamentals@0.2.2`
- `@tylerbu/cli-api@0.7.2`

</details>

## 0.5.0

### Minor Changes

- Export all default policies _[`#213`](https://github.com/tylerbutler/tools-monorepo/pull/213) [`3fc530b`](https://github.com/tylerbutler/tools-monorepo/commit/3fc530bad66259339547b3d8ec12b9265daea9a5) [@tylerbutler](https://github.com/tylerbutler)_

  repopo now exports all included policies individually so users can opt in and out of them in their config.

- New policies _[`#31`](https://github.com/tylerbutler/tools-monorepo/pull/31) [`c97a565`](https://github.com/tylerbutler/tools-monorepo/commit/c97a56518d9726667531aa71de9445fed8d56b96) [@tylerbutler](https://github.com/tylerbutler)_

  - JsTsFileHeaders
  - HtmlFileHeaders
  - PackageScripts

- API changes: _[`#120`](https://github.com/tylerbutler/tools-monorepo/pull/120) [`1108950`](https://github.com/tylerbutler/tools-monorepo/commit/1108950a7732dcc3ac9b8da10bd014bfec6c45b7) [@tylerbutler](https://github.com/tylerbutler)_

  - **Breaking change**: `PolicyConfig` was renamed to `RepopoConfig`.
  - **Breaking change**: Removed several flags from the check command.

  Other changes:

  - Refactor check command for clarity (more to do)

- Functions to more easily create package.json handlers _[`#190`](https://github.com/tylerbutler/tools-monorepo/pull/190) [`84c4185`](https://github.com/tylerbutler/tools-monorepo/commit/84c4185e76186c3489a4b70e3a3015ba289df139) [@tylerbutler](https://github.com/tylerbutler)_

  repopo now provides functions that can be used to generate policies for common files like package.json.

### Patch Changes

- Update dependencies _[`#217`](https://github.com/tylerbutler/tools-monorepo/pull/217) [`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 2 dependencies</summary>

<small>

[`dcec014`](https://github.com/tylerbutler/tools-monorepo/commit/dcec014dfb70e5804a7535b5b8b9a3406f3e623d)

</small>

- `@tylerbu/fundamentals@0.2.1`
- `@tylerbu/cli-api@0.7.1`

</details>

## 0.4.0

### Minor Changes

- Improve cross-platform path handling _[`#176`](https://github.com/tylerbutler/tools-monorepo/pull/176) [`2d095c7`](https://github.com/tylerbutler/tools-monorepo/commit/2d095c7828037fc58147d0aa487b736dbd345472) [@tylerbutler](https://github.com/tylerbutler)_

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`a4b7624`](https://github.com/tylerbutler/tools-monorepo/commit/a4b7624cceea2f7246391c2d54329010cbb145ff) [`e27ae36`](https://github.com/tylerbutler/tools-monorepo/commit/e27ae3682d093eb61c2cb31de787ec378287db4f) [`ede1957`](https://github.com/tylerbutler/tools-monorepo/commit/ede19579ffc630f6e176046c6e11e170849a0d48) [`33b9c01`](https://github.com/tylerbutler/tools-monorepo/commit/33b9c01ed2d5d0c4bdb32262f549531650c48ad0) [`2d095c7`](https://github.com/tylerbutler/tools-monorepo/commit/2d095c7828037fc58147d0aa487b736dbd345472)

</small>

- `@tylerbu/cli-api@0.7.0`
- `sort-tsconfig@0.2.0`

</details>

## 0.3.2

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`7406bbf`](https://github.com/tylerbutler/tools-monorepo/commit/7406bbf1131028058178d53f4e64564660c4d495)

</small>

- `@tylerbu/cli-api@0.6.1`
- `sort-tsconfig@0.1.4`

</details>

## 0.3.1

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137) [`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137)

</small>

- `@tylerbu/cli-api@0.6.0`
- `sort-tsconfig@0.1.3`

</details>

## 0.3.0

### Minor Changes

- New command: `list` _[`#132`](https://github.com/tylerbutler/tools-monorepo/pull/132) [`1fa083d`](https://github.com/tylerbutler/tools-monorepo/commit/1fa083dd64499d108411326377a4463ad6acb040) [@tylerbutler](https://github.com/tylerbutler)_

  The `repopo list` command lists the policies that are enabled in the repo.

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`f803610`](https://github.com/tylerbutler/tools-monorepo/commit/f803610f64936c5d49d862b2f4240ea248fe3f76)

</small>

- `@tylerbu/cli-api@0.5.0`
- `sort-tsconfig@0.1.2`

</details>

## 0.2.2

### Patch Changes

- Publish repopo package _[`#125`](https://github.com/tylerbutler/tools-monorepo/pull/125) [`12b3a58`](https://github.com/tylerbutler/tools-monorepo/commit/12b3a58e8946b0988009331bf1830e1fa1cc6567) [@tylerbutler](https://github.com/tylerbutler)_

## 0.2.1

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`61fade5`](https://github.com/tylerbutler/tools-monorepo/commit/61fade577c27a6ad55c79d997eb42ecc0ca9abe9)

</small>

- `sort-tsconfig@0.1.1`

</details>

## 0.2.0

### Minor Changes

- PackageJsonSortedPolicy keeps package.json files sorted _[`#114`](https://github.com/tylerbutler/tools-monorepo/pull/114) [`0664ac5`](https://github.com/tylerbutler/tools-monorepo/commit/0664ac5731c5dd23bc1c21070fe880335f46489b) [@tylerbutler](https://github.com/tylerbutler)_

  The new `PackageJsonSortedPolicy` policy enforces that package.json files are always sorted according to sort-package-json.

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`cbdec3f`](https://github.com/tylerbutler/tools-monorepo/commit/cbdec3f7b3daa4ec642b44a5de046fff8420f15a) [`d55c982`](https://github.com/tylerbutler/tools-monorepo/commit/d55c982f960b56a79f0e0d35dd9102a25882032f) [`ddcbd48`](https://github.com/tylerbutler/tools-monorepo/commit/ddcbd48a161d8be666ff537316fa018d8c0b7ad8)

</small>

- `@tylerbu/cli-api@0.4.0`
- `sort-tsconfig@0.1.0`

</details>

## 0.1.1

### Patch Changes

- Fix homepage URL _[`#99`](https://github.com/tylerbutler/tools-monorepo/pull/99) [`0654323`](https://github.com/tylerbutler/tools-monorepo/commit/06543231947fa5267863e5467d5837a51cf3d44b) [@tylerbutler](https://github.com/tylerbutler)_

<details><summary>Updated 1 dependency</summary>

<small>

[`0654323`](https://github.com/tylerbutler/tools-monorepo/commit/06543231947fa5267863e5467d5837a51cf3d44b)

</small>

- `@tylerbu/cli-api@0.3.1`

</details>

## 0.1.0

### Minor Changes

- Introducing repopo, a tool to make sure the files in a git repository adhere to configurable policies _[`#16`](https://github.com/tylerbutler/tools-monorepo/pull/16) [`030fd98`](https://github.com/tylerbutler/tools-monorepo/commit/030fd980ee45471074a8f41aab46d1a5b025b2f6) [@tylerbutler](https://github.com/tylerbutler)_

  You can use repopo to make sure all source files have a common header, check that all packages have a particular field
  in package.json, etc. You can extend repopo with your own policies or policies from the ecosystem.

  For more information, see the [repopo readme](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/README.md).

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`f54b0e7`](https://github.com/tylerbutler/tools-monorepo/commit/f54b0e71dd1d54c5e3730b7a1f1ab1a53b9b7943)

</small>

- `@tylerbu/cli-api@0.3.0`

</details>

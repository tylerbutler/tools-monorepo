# dill-cli

## 0.2.3

### Patch Changes

- Update to use new cli-api logger API _[`#395`](https://github.com/tylerbutler/tools-monorepo/pull/395) [`ee059d0`](https://github.com/tylerbutler/tools-monorepo/commit/ee059d02161494c14eb6131aaf32624902fd65e4) [@tylerbutler](https://github.com/tylerbutler)_

  Updates commands to use the new logger API from @tylerbu/cli-api:
  - Replace `errorLog()` calls with `logError()`
  - Use standalone `logIndent()` function where needed

<details><summary>Updated 2 dependencies</summary>

<small>

[`ee059d0`](https://github.com/tylerbutler/tools-monorepo/commit/ee059d02161494c14eb6131aaf32624902fd65e4) [`ee059d0`](https://github.com/tylerbutler/tools-monorepo/commit/ee059d02161494c14eb6131aaf32624902fd65e4)

</small>

- `@tylerbu/cli-api@0.10.0`
- `@tylerbu/sail-infrastructure@0.4.0`

</details>

## 0.2.2

### Patch Changes

- Fix donefile generation when output files don't exist _[`#426`](https://github.com/tylerbutler/tools-monorepo/pull/426) [`5cc8e17`](https://github.com/tylerbutler/tools-monorepo/commit/5cc8e17d382828b0679f2e68df5cc40271945919) [@tylerbutler](https://github.com/tylerbutler)_

  Donefile generation would fail during clean builds when output files don't exist yet (e.g., CopyfilesTask before copying). The LeafWithDoneFileTask.getDoneFileContent() method now gracefully handles missing files by returning a sentinel value "<missing>" instead of throwing ENOENT errors. This allows donefile generation to succeed even when output files haven't been created yet, while still tracking which files are expected.

- Fix WebpackTask getEnvArguments method missing return statement _[`#426`](https://github.com/tylerbutler/tools-monorepo/pull/426) [`5cc8e17`](https://github.com/tylerbutler/tools-monorepo/commit/5cc8e17d382828b0679f2e68df5cc40271945919) [@tylerbutler](https://github.com/tylerbutler)_

  The WebpackTask.getEnvArguments() method was building the environment arguments object but not returning it, causing all --env flags to be ignored during webpack execution. This fix adds the missing return statement, allowing webpack environment variables to be properly passed through.

## 0.2.1

### Patch Changes

- Fix copyfiles warnings due to path separator mismatch _[`#412`](https://github.com/tylerbutler/tools-monorepo/pull/412) [`5888c32`](https://github.com/tylerbutler/tools-monorepo/commit/5888c323b4bbb510d78902477a2e18c8580d2485) [@tylerbutler](https://github.com/tylerbutler)_

  The CopyfilesTask was incorrectly mixing POSIX path separators (forward slashes) with OS-native path operations, causing output file path calculations to fail on Windows. This resulted in warnings about being unable to generate content for done files (e.g., "WARNING: unable to generate content for copyfiles-5c0eb27a.done.build.log").

  Fixed by removing the unnecessary `toPosixPath()` conversion and consistently using OS-native paths throughout the `getOutputFiles()` method.

- Fix progress bar task counting to match displayed task numbers _[`#413`](https://github.com/tylerbutler/tools-monorepo/pull/413) [`9e4dd36`](https://github.com/tylerbutler/tools-monorepo/commit/9e4dd36ac1110cf5f9e131f241273808ae657076) [@tylerbutler](https://github.com/tylerbutler)_

  The progress bar now correctly includes execution-time skips (tasks skipped during execution via cache hits or recheck) in its count, matching the task numbers displayed in the output. Previously, the progress bar would lag behind the actual task numbers because it only counted built tasks, not skipped tasks.

## 0.2.0

### Minor Changes

- Add file ignore filtering to config inference _[`025f2cd`](https://github.com/tylerbutler/tools-monorepo/commit/025f2cd865535eb79bf5f17d5102bdeaf25a90e8) [@tylerbutler](https://github.com/tylerbutler)_

  Add support for ignoring files during config inference via the SAIL_IGNORE_FILES environment variable. This allows users to exclude specific repo-relative paths from being considered when sail automatically infers the workspace configuration.

  Example usage:

  ```bash
  SAIL_IGNORE_FILES="test/fixtures/**,temp/**" sail scan --infer
  sail scan --infer --ignore-files "test/fixtures/**"
  ```

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`8832369`](https://github.com/tylerbutler/tools-monorepo/commit/8832369318b6efee8adae1636f3629639b0d76ac) [`025f2cd`](https://github.com/tylerbutler/tools-monorepo/commit/025f2cd865535eb79bf5f17d5102bdeaf25a90e8)

</small>

- `@tylerbu/cli-api@0.9.0`
- `@tylerbu/sail-infrastructure@0.3.0`

</details>

## 0.1.0

### Minor Changes

- Add pinned progress bar for build execution _[`#370`](https://github.com/tylerbutler/tools-monorepo/pull/370) [`2181b2b`](https://github.com/tylerbutler/tools-monorepo/commit/2181b2b5c1967e5c371df73b9b96250b52e86cbd) [@tylerbutler](https://github.com/tylerbutler)_

  Sail now displays a progress bar that stays pinned at the bottom of your terminal during builds, making it easy to track build progress at a glance. The progress bar shows a visual indicator, percentage complete, task count, and estimated time remaining (e.g., "Building [========] 50% 25/50 tasks | ETA: 2m 30s").

  Task output continues to scroll normally above the progress bar, so you can still see detailed logs from each task while monitoring overall build progress. The progress bar automatically appears when running builds in interactive terminal sessions and respects the `--quiet` flag when you need silent output.

- Add Sail build orchestration CLI tool for monorepos _[`#360`](https://github.com/tylerbutler/tools-monorepo/pull/360) [`18a125a`](https://github.com/tylerbutler/tools-monorepo/commit/18a125ae7171b48fe80ae33ba4e841259d147e79) [@tylerbutler](https://github.com/tylerbutler)_

  Introduces Sail, a powerful build orchestration CLI tool designed specifically for monorepos. Sail provides intelligent task execution with dependency resolution, incremental builds, and parallel processing capabilities. It analyzes package dependencies and executes build tasks in optimal order, dramatically improving build performance in complex monorepo environments.

  The tool supports flexible task configuration through multiple file formats (sailrc, sail.config.js/ts, or package.json), declarative task definitions with dependency expansion syntax, and advanced features including persistent file-based caching, worker thread pooling for compilation tasks, and customizable parallel execution with priority queuing. Sail integrates seamlessly with TypeScript (tsc), Biome, API Extractor, and other build tools commonly used in TypeScript monorepos.

  Key features include dependency-aware task scheduling using `dependsOn`, `before`, and `after` directives, smart change detection to avoid unnecessary rebuilds, configurable concurrency with optional worker thread support, and comprehensive build statistics with performance profiling. Run `sail build` to orchestrate your monorepo builds or `sail scan` to visualize how Sail interprets your repository structure.

### Patch Changes

<details><summary>Updated 2 dependencies</summary>

<small>

[`b0d8cb9`](https://github.com/tylerbutler/tools-monorepo/commit/b0d8cb9a9ee27a0b778ee58055bcbdd7d6d9b4eb) [`18a125a`](https://github.com/tylerbutler/tools-monorepo/commit/18a125ae7171b48fe80ae33ba4e841259d147e79) [`08e571f`](https://github.com/tylerbutler/tools-monorepo/commit/08e571f028e868d5db1c337e51804f5884cd2f4a)

</small>

- `@tylerbu/cli-api@0.8.0`
- `@tylerbu/sail-infrastructure@0.2.0`

</details>

## 0.1.5

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`7406bbf`](https://github.com/tylerbutler/tools-monorepo/commit/7406bbf1131028058178d53f4e64564660c4d495)

</small>

- `@tylerbu/cli-api@0.6.1`

</details>

## 0.1.4

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137) [`b894a2d`](https://github.com/tylerbutler/tools-monorepo/commit/b894a2dfd5538247d1a625b423e61b437207f137)

</small>

- `@tylerbu/cli-api@0.6.0`

</details>

## 0.1.3

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`f803610`](https://github.com/tylerbutler/tools-monorepo/commit/f803610f64936c5d49d862b2f4240ea248fe3f76)

</small>

- `@tylerbu/cli-api@0.5.0`

</details>

## 0.1.2

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`cbdec3f`](https://github.com/tylerbutler/tools-monorepo/commit/cbdec3f7b3daa4ec642b44a5de046fff8420f15a) [`d55c982`](https://github.com/tylerbutler/tools-monorepo/commit/d55c982f960b56a79f0e0d35dd9102a25882032f)

</small>

- `@tylerbu/cli-api@0.4.0`

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

- Introducing dill, a CLI app to download files and optionally decompress their contents. It also provides a simple programmatic API. _[`#8`](https://github.com/tylerbutler/tools-monorepo/pull/8) [`dac542b`](https://github.com/tylerbutler/tools-monorepo/commit/dac542b02484b11a16f2efc8a1e6dd02dcb2b611) [@tylerbutler](https://github.com/tylerbutler)_

  Implementation-wise, dill uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
  via [node-fetch-native](https://github.com/unjs/node-fetch-native) to download files, which means it is reasonably
  cross-platform and will use native Fetch implementations where available.

  For more information, see the [dill readme](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/dill/README.md).

### Patch Changes

<details><summary>Updated 1 dependency</summary>

<small>

[`f54b0e7`](https://github.com/tylerbutler/tools-monorepo/commit/f54b0e71dd1d54c5e3730b7a1f1ab1a53b9b7943)

</small>

- `@tylerbu/cli-api@0.3.0`

</details>

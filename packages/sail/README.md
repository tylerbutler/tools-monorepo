# sail - build stuff

<!-- toc -->
* [sail - build stuff](#sail---build-stuff)
* [Installation](#installation)
* [Commands](#commands)
<!-- tocstop -->

# Installation

Coming soon.

# Commands

<!-- commands -->
* [`sail build [PARTIAL_NAME]`](#sail-build-partial_name)
* [`sail cache:clean`](#sail-cacheclean)
* [`sail cache:info`](#sail-cacheinfo)
* [`sail cache:prune`](#sail-cacheprune)
* [`sail cache:stats`](#sail-cachestats)
* [`sail cache:verify`](#sail-cacheverify)
* [`sail scan [SCAN_DIR]`](#sail-scan-scan_dir)

## `sail build [PARTIAL_NAME]`

Build stuff.

```
USAGE
  $ sail build [PARTIAL_NAME] [-v | --quiet] [--all | -g <value> | -w <value>] [--cacheDir <value>]
    [--skipCacheWrite] [--verifyCacheIntegrity] [-t <value>...] [-c | -r] [--force] [--vscode] [--workerMemoryLimitMB
    <value> --worker] [--concurrency <value>]

ARGUMENTS
  [PARTIAL_NAME]  [default: .] Regular expression or string to filter packages by name.

FLAGS
  -g, --releaseGroup=<value>  The name of a release group.
  -t, --task=<value>...       [default: build] The task to execute. Multiple tasks can be provided.
  -w, --workspace=<value>     The name of a release group.
      --all                   Run tasks for all packages.
      --cacheDir=<value>      Path to shared cache directory.
      --force                 Force the tasks to run, ignoring dependencies.
      --skipCacheWrite        Read from cache but don't write to it (read-only mode).
      --verifyCacheIntegrity  Verify file hashes when restoring from cache (adds overhead).
      --vscode                Output error messages to work with the default problem matcher in VS Code.

OTHER TASK FLAGS
  -c, --clean    Same as '--task clean'.
  -r, --rebuild  Same as '--task clean --task build'.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

RUN FLAGS
  --concurrency=<value>          [default: 12] How many tasks can execute at a time. Defaults to 'os.cpus().length'.
  --worker                       Reuse worker threads for some tasks, increasing memory use but lowering overhead.
  --workerMemoryLimitMB=<value>  Memory limit for worker threads in MB. Only works with '--worker'.

DESCRIPTION
  Build stuff.

ALIASES
  $ sail b

EXAMPLES
  $ sail build
```

_See code: [src/commands/build.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/build.ts)_

## `sail cache:clean`

Remove all cache entries. Use --force to confirm.

```
USAGE
  $ sail cache:clean -f [-v | --quiet] [--cacheDir <value>]

FLAGS
  -f, --force             (required) Confirm removal of all cache entries.
      --cacheDir=<value>  Path to shared cache directory.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Remove all cache entries. Use --force to confirm.

EXAMPLES
  $ sail cache:clean --force

  $ sail cache:clean --force --cache-dir /path/to/cache
```

_See code: [src/commands/cache/clean.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/cache/clean.ts)_

## `sail cache:info`

Display cache configuration and location information.

```
USAGE
  $ sail cache:info [-v | --quiet] [--cacheDir <value>]

FLAGS
  --cacheDir=<value>  Path to shared cache directory.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Display cache configuration and location information.

EXAMPLES
  $ sail cache:info

  $ sail cache:info --cache-dir /path/to/cache
```

_See code: [src/commands/cache/info.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/cache/info.ts)_

## `sail cache:prune`

Prune old cache entries based on age and size limits.

```
USAGE
  $ sail cache:prune [-v | --quiet] [--cacheDir <value>]

FLAGS
  --cacheDir=<value>  Path to shared cache directory.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Prune old cache entries based on age and size limits.

EXAMPLES
  $ sail cache:prune

  $ sail cache:prune --cache-dir /path/to/cache
```

_See code: [src/commands/cache/prune.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/cache/prune.ts)_

## `sail cache:stats`

Display cache statistics.

```
USAGE
  $ sail cache:stats [-v | --quiet] [--cacheDir <value>]

FLAGS
  --cacheDir=<value>  Path to shared cache directory.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Display cache statistics.

EXAMPLES
  $ sail cache:stats

  $ sail cache:stats --cache-dir /path/to/cache
```

_See code: [src/commands/cache/stats.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/cache/stats.ts)_

## `sail cache:verify`

Verify cache integrity (check for corruption).

```
USAGE
  $ sail cache:verify [-v | --quiet] [--cacheDir <value>] [--fix] [-f]

FLAGS
  -f, --force             Confirm fixing corrupted cache entries when using --fix.
      --cacheDir=<value>  Path to shared cache directory.
      --fix               Fix corrupted cache entries. Requires --force to confirm.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Verify cache integrity (check for corruption).

EXAMPLES
  $ sail cache:verify

  $ sail cache:verify --fix --force

  $ sail cache:verify --cache-dir /path/to/cache
```

_See code: [src/commands/cache/verify.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/cache/verify.ts)_

## `sail scan [SCAN_DIR]`

Scan a path to see it the way Sail sees it.

```
USAGE
  $ sail scan [SCAN_DIR] [-v | --quiet] [--infer]

ARGUMENTS
  [SCAN_DIR]  [default: .] Directory to scan.

FLAGS
  --infer  Skip loading configuration from files. Instead the configuration will be inferred.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Scan a path to see it the way Sail sees it.
```

_See code: [src/commands/scan.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/scan.ts)_
<!-- commandsstop -->

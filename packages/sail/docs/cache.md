`sail cache`
============

Remove all cache entries. Use --force to confirm.

* [`sail cache:clean`](#sail-cacheclean)
* [`sail cache:info`](#sail-cacheinfo)
* [`sail cache:prune`](#sail-cacheprune)
* [`sail cache:stats`](#sail-cachestats)
* [`sail cache:verify`](#sail-cacheverify)

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

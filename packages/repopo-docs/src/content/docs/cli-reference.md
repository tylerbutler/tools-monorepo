---
title: CLI reference
---

<!-- commands -->
* [`repopo check`](#repopo-check)
* [`repopo check-native`](#repopo-check-native)
* [`repopo list`](#repopo-list)

## `repopo check`

Checks and applies policies to the files in the repository.

```
USAGE
  $ repopo check [-v | --quiet] [-f] [--stdin]

FLAGS
  -f, --fix    Fix errors if possible.
      --stdin  Read list of files from stdin.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.
```

_See code: [src/commands/check.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check.ts)_

## `repopo check-native`

Checks and applies policies using the Rust engine.

```
USAGE
  $ repopo check-native [-f] [--stdin] [-v] [-q] [-c <value>] [--sidecar-path <value>] [--binary-path <value>]
    [--runtime auto|node|bun]

FLAGS
  -c, --config=<value>        Path to the config file.
  -f, --fix                   Fix errors if possible.
  -q, --quiet                 Suppress all output except errors.
  -v, --verbose               Show verbose output including per-policy timing.
      --binary-path=<value>   [env: REPOPO_CORE_PATH] Path to the repopo-core Rust binary.
      --runtime=<option>      [env: REPOPO_RUNTIME] JS runtime for the sidecar process (auto, node, bun).
                              <options: auto|node|bun>
      --sidecar-path=<value>  [env: REPOPO_SIDECAR_PATH] Path to the Node.js sidecar script.
      --stdin                 Read list of files from stdin.

DESCRIPTION
  Checks and applies policies using the Rust engine.

  Runs the Rust-based repopo-core engine with the Node.js sidecar. This provides the same policy checking as 'check' but
  with Rust-based file enumeration, regex matching, and orchestration for better performance.
```

_See code: [src/commands/check-native.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check-native.ts)_

## `repopo list`

Lists the policies configured to run.

```
USAGE
  $ repopo list [-v | --quiet]

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.
```

_See code: [src/commands/list.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/list.ts)_
<!-- commandsstop -->

---
title: CLI reference
---

<!-- commands -->
* [`repopo check`](#repopo-check)
* [`repopo check-native`](#repopo-check-native)
* [`repopo list`](#repopo-list)
* [`repopo prepare`](#repopo-prepare)

## `repopo check`

Checks and applies policies to the files in the repository.

```
USAGE
  $ repopo check [-v | --quiet] [--concurrency <value>] [-f] [--stdin]

FLAGS
  -f, --fix                  Fix errors if possible.
      --concurrency=<value>  [default: 8] Maximum concurrent files in read-only checks. Fixes remain sequential.
      --stdin                Read list of files from stdin.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Checks and applies policies to the files in the repository.

  File policies check selected files. Repository policies always run with the full repository file inventory, including
  with --stdin. With --fix, repository policies can modify files outside the stdin selection.
```

_See code: [src/commands/check.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check.ts)_

## `repopo check-native`

Checks and applies policies using the Rust engine.

```
USAGE
  $ repopo check-native [-v | -q] [-c <value>] [--sidecar-path <value>] [--binary-path <value>] [--runtime
    auto|node|bun] [--concurrency <value>] [-f] [--stdin] [--mode auto|quickjs|ipc]

FLAGS
  -c, --config=<value>        Path to the config file or discovery directory.
  -f, --fix                   Fix errors if possible.
  -q, --quiet                 Suppress all output except errors.
  -v, --verbose               Show verbose output including cache diagnostics.
      --binary-path=<value>   [env: REPOPO_CORE_PATH] Path to the repopo-core Rust binary.
      --concurrency=<value>   [default: 8] Maximum concurrent files in read-only checks. Fixes remain sequential.
      --mode=<option>         [default: auto] Backend selection: automatic, strict QuickJS, or forced IPC.
                              <options: auto|quickjs|ipc>
      --runtime=<option>      [env: REPOPO_RUNTIME] JavaScript runtime for cold preparation or IPC.
                              <options: auto|node|bun>
      --sidecar-path=<value>  [env: REPOPO_SIDECAR_PATH] Path to the JavaScript sidecar and preparation scripts.
      --stdin                 Read list of files from stdin.

DESCRIPTION
  Checks and applies policies using the Rust engine.

  Uses cached policy code in QuickJS when supported. In auto mode, unsupported capabilities select IPC for the whole run
  before config or policies execute. Use --mode quickjs to require QuickJS, or --mode ipc to bypass preparation.
  Repository policies always use the full Git inventory, including with --stdin. With --fix, repository policies can
  modify files outside the stdin selection.
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

## `repopo prepare`

Prepares native policy execution without running config or policies.

```
USAGE
  $ repopo prepare [-v | -q] [-c <value>] [--sidecar-path <value>] [--binary-path <value>] [--runtime
    auto|node|bun]

FLAGS
  -c, --config=<value>        Path to the config file or discovery directory.
  -q, --quiet                 Suppress all output except errors.
  -v, --verbose               Show verbose output including cache diagnostics.
      --binary-path=<value>   [env: REPOPO_CORE_PATH] Path to the repopo-core Rust binary.
      --runtime=<option>      [env: REPOPO_RUNTIME] JavaScript runtime for cold preparation or IPC.
                              <options: auto|node|bun>
      --sidecar-path=<value>  [env: REPOPO_SIDECAR_PATH] Path to the JavaScript sidecar and preparation scripts.

DESCRIPTION
  Prepares native policy execution without running config or policies.

  Compiles and validates executable policy code in the Git-private per-worktree cache. Reports QuickJS eligibility or
  the reason IPC is required. Requires Node or Bun on a cache miss. A valid cached artifact is reused. Does not evaluate
  the config, run handlers, or apply fixes.
```

_See code: [src/commands/prepare.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/prepare.ts)_
<!-- commandsstop -->

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
* [`sail scan [SCAN_DIR]`](#sail-scan-scan_dir)

## `sail build [PARTIAL_NAME]`

Build stuff.

```
USAGE
  $ sail build [PARTIAL_NAME] [-v | --quiet] [--all | -g <value> | -w <value>] [-t <value>...] [-c | -r]
    [--force] [--vscode] [--workerMemoryLimitMB <value> --worker] [--concurrency <value>]

ARGUMENTS
  [PARTIAL_NAME]  [default: .] Regular expression or string to filter packages by name.

FLAGS
  -g, --releaseGroup=<value>  The name of a release group.
  -t, --task=<value>...       [default: build] The task to execute. Multiple tasks can be provided.
  -w, --workspace=<value>     The name of a release group.
      --all                   Run tasks for all packages.
      --force                 Force the tasks to run, ignoring dependencies.
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

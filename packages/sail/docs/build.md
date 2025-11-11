`sail build`
============

Build stuff.

* [`sail build [PARTIAL_NAME]`](#sail-build-partial_name)

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
      --cacheDir=<value>      [env: SAIL_CACHE_DIR] Path to shared cache directory.
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
  --concurrency=<value>          How many tasks can execute at a time. Defaults to 'os.cpus().length'.
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

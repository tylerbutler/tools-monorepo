`sail build`
============

Builds packages.

* [`sail build [BUILDPATH]`](#sail-build-buildpath)

## `sail build [BUILDPATH]`

Builds packages.

```
USAGE
  $ sail build [BUILDPATH] [-v | --quiet] [-c] [-f] [-g <value> | --all] [-t <value>...] [--vscode]

ARGUMENTS
  BUILDPATH  Path to project that you want to build. Passing '.' will build the current package or release group.

FLAGS
  -c, --clean                 Include the 'clean' task on matched packages (all if package regexp is not specified).
  -f, --force                 Force build and ignore dependency check on matched packages (all if package regexp is not
                              specified).
  -g, --releaseGroup=<value>  A release group to build.
  -t, --task=<value>...       [default: build] Task to execute. Can be specified multiple times to run multiple tasks.
      --all                   Build all packages.
      --vscode                Output error message to work with default problem matcher in vscode.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Builds packages.

EXAMPLES
  Run the 'build' task on the current project.

    $ sail build .

  Run the 'clean' task followed by the 'build' task on the current project.

    $ sail build . -c

  Run the 'check' and 'test' tasks on the current project.

    $ sail build . -t check -t test
```

_See code: [src/commands/build.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/build.ts)_

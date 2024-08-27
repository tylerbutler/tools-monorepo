# sort-tsconfig - keep your tsconfigs clean and tidy

sort-tsconfig is a CLI app to sort tsconfig files. It also provides a simple programmatic API.

<!-- toc -->
* [sort-tsconfig - keep your tsconfigs clean and tidy](#sort-tsconfig---keep-your-tsconfigs-clean-and-tidy)
* [Usage](#usage)
* [API](#api)
<!-- tocstop -->

# Usage

<!-- commands -->
* [`sort-tsconfig sort TSCONFIG`](#sort-tsconfig-sort-tsconfig)

## `sort-tsconfig sort TSCONFIG`

Sorts a tsconfig file in place, or check that one is sorted.

```
USAGE
  $ sort-tsconfig sort TSCONFIG [-v | --quiet] [--write]

ARGUMENTS
  TSCONFIG  Path to the tsconfig file to sort, or a glob path to select multiple tsconfigs.

FLAGS
  --write  Write the sorted contents back to the file. Without this flag, the command only checks that the file is
           sorted.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Sorts a tsconfig file in place, or check that one is sorted.

  By default, the command will only check if a tsconfig is sorted. Use the --write flag to write the sorted contents
  back to the file.

ALIASES
  $ sort-tsconfig sort:tsconfigs
  $ sort-tsconfig sort-tsconfigs

EXAMPLES
  Check if the tsconfig.json file in the current working directory is sorted.

    $ sort-tsconfig sort .

  Sort the tsconfig.json file in the current working directory.

    $ sort-tsconfig sort . --write

  Sort all tsconfig.json files under the packages directory.

    $ sort-tsconfig sort 'packages/**/tsconfig.json' --write
```

_See code: [src/commands/sort.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sort-tsconfig/src/commands/sort.ts)_
<!-- commandsstop -->

# API

See [sort-tsconfig.api.md](./api-docs/sort-tsconfig.api.md).

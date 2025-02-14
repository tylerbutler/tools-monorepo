# sort-tsconfig - keep your tsconfigs clean and tidy

sort-tsconfig is a CLI app to sort tsconfig files. It also provides a simple [programmatic API][API].

<!-- toc -->
* [sort-tsconfig - keep your tsconfigs clean and tidy](#sort-tsconfig---keep-your-tsconfigs-clean-and-tidy)
* [Configuration](#configuration)
* [Usage](#usage)
* [API](#api)
<!-- tocstop -->

# Configuration

TODO

# Usage

<!-- commands -->
* [`sort-tsconfig TSCONFIG`](#sort-tsconfig-tsconfig)

## `sort-tsconfig TSCONFIG`

Sorts a tsconfig file in place or checks that one is sorted.

```
USAGE
  $ sort-tsconfig  TSCONFIG [-v | --quiet] [-w] [--config <value>]

ARGUMENTS
  TSCONFIG  A path to the tsconfig file to sort, or a glob pattern to select multiple tsconfigs. The node_modules folder
            is always excluded from glob matches.

FLAGS
  -w, --write  Write the sorted contents back to the file. Without this flag, the command only checks that the file is
               sorted.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

CONFIGURATION FLAGS
  --config=<value>  The path to a configuration file.

DESCRIPTION
  Sorts a tsconfig file in place or checks that one is sorted.

  By default, the command will only check if a tsconfig is sorted. Use the '--write' flag to write the sorted contents
  back to the file.

ALIASES
  $ sort-tsconfig sort:tsconfigs
  $ sort-tsconfig sort-tsconfigs

EXAMPLES
  Check if the tsconfig.json file in the current working directory is sorted.

    $ sort-tsconfig  .

  Sort the tsconfig.json file in the current working directory.

    $ sort-tsconfig  . --write

  Sort all tsconfig.json files under the packages directory.

    $ sort-tsconfig  'packages/**/tsconfig.json' --write
```
<!-- commandsstop -->

# API

See [sort-tsconfig.api.md][API].

[API]: ./api-docs/sort-tsconfig.api.md

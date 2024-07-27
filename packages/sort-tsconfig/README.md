# sort-tsconfig

sort-tsconfig is a CLI app to sort tsconfig files and optionally decompress their contents. It also provides a simple
programmatic API.

<!-- toc -->
* [sort-tsconfig](#sort-tsconfig)
* [Why?](#why)
* [Usage](#usage)
<!-- tocstop -->

# Why?

Sorting files consistently eases long-term maintenance of config files.

# Usage

<!-- commands -->
* [`sort-tsconfig TSCONFIG`](#sort-tsconfig-tsconfig)

## `sort-tsconfig TSCONFIG`

Sorts a tsconfig file in place, or check that one is sorted.

```
USAGE
  $ sort-tsconfig  TSCONFIG [-v | --quiet] [--write]

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

EXAMPLES
  Check if the tsconfig.json file in the current working directory is sorted.

    $ sort-tsconfig  .

  Sort the tsconfig.json file in the current working directory.

    $ sort-tsconfig  . --write

  Sort all tsconfig.json files under the packages directory.

    $ sort-tsconfig  'packages/**/tsconfig.json' --write
```
<!-- commandsstop -->

# sort-tsconfig

sort-tsconfig is a CLI app to sort tsconfig files. It also provides a simple programmatic API.

<!-- toc -->
* [sort-tsconfig](#sort-tsconfig)
* [Why?](#why)
* [Usage](#usage)
<!-- tocstop -->

# Why?

Sorting config files consistently eases long-term maintenance.

# Usage

<!-- commands -->
* [`sort-tsconfig`](#sort-tsconfig)

## `sort-tsconfig`

Sorts a tsconfig file in place, or check that one is sorted.

```
USAGE
  $ sort-tsconfig  [-v | --quiet]

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

    $ sort-tsconfig  .

  Sort the tsconfig.json file in the current working directory.

    $ sort-tsconfig  . --write

  Sort all tsconfig.json files under the packages directory.

    $ sort-tsconfig  'packages/**/tsconfig.json' --write
```
<!-- commandsstop -->

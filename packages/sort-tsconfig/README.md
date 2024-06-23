# @tylerbu/sort-tsconfig - keep your tsconfigs clean and tidy.

@tylerbu/sort-tsconfig is a CLI app sort tsconfig files. It also provides a simple programmatic
API.

<!-- toc -->
* [@tylerbu/sort-tsconfig - keep your tsconfigs clean and tidy.](#tylerbusort-tsconfig---keep-your-tsconfigs-clean-and-tidy)
* [Usage](#usage)
<!-- tocstop -->

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

EXAMPLES
  Check if the tsconfig.json file in the current working directory is sorted.

    $ sort-tsconfig  .

  Sort the tsconfig.json file in the current working directory.

    $ sort-tsconfig  . --write

  Sort all tsconfig.json files under the packages directory.

    $ sort-tsconfig  'packages/**/tsconfig.json' --write
```
<!-- commandsstop -->

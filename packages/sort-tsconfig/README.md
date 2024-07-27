# @tylerbu/sort-tsconfig - keep your tsconfigs clean and tidy.

@tylerbu/sort-tsconfig is a CLI app sort tsconfig files. It also provides a simple programmatic
API.

<!-- toc -->
* [@tylerbu/sort-tsconfig - keep your tsconfigs clean and tidy.](#tylerbusort-tsconfig---keep-your-tsconfigs-clean-and-tidy)
* [Usage](#usage)
* [API](#api)
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

# API

```ts
// Checks if a tsconfig file is sorted.
export function isSorted(tsconfig: string): boolean;

// Sorts a file in place. The sorted contents is always returned; use `write: true` to write file.
export function sortTsconfigFile(tsconfigPath: string, write: boolean): SortTsconfigResult;

// Result of a tsconfig sort operation.
export interface SortTsconfigResult {
    // Will be `true` if the file was already sorted.
    alreadySorted: boolean;
    // The sorted tsconfig string.
    tsconfig: string;
}
```

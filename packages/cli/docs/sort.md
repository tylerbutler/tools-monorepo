`tbu sort`
==========

Commands to sort config files like tsconfigs.

* [`tbu sort tsconfig TSCONFIG`](#tbu-sort-tsconfig-tsconfig)

## `tbu sort tsconfig TSCONFIG`

Sorts a tsconfig file in place, or check that one is sorted.

```
USAGE
  $ tbu sort tsconfig TSCONFIG [-v | --quiet] [--write]

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
  $ tbu sort tsconfigs

EXAMPLES
  Check if the tsconfig.json file in the current working directory is sorted.

    $ tbu sort tsconfig .

  Sort the tsconfig.json file in the current working directory.

    $ tbu sort tsconfig . --write

  Sort all tsconfig.json files under the packages directory.

    $ tbu sort tsconfig 'packages/**/tsconfig.json' --write
```

_See code: [src/commands/sort/tsconfig.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/sort/tsconfig.ts)_

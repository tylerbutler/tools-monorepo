`tbu sort`
==========

Commands to sort config files like tsconfigs.

* [`tbu sort tsconfig`](#tbu-sort-tsconfig)

## `tbu sort tsconfig`

Sorts a tsconfig file in place, or check that one is sorted.

```
USAGE
  $ tbu sort tsconfig [-v | --quiet]

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Sorts a tsconfig file in place, or check that one is sorted.

  By default, the command will only check if a tsconfig is sorted. Use the --write flag to write the sorted contents
  back to the file.

ALIASES
  $ tbu sort tsconfigs
  $ tbu sort-tsconfigs

EXAMPLES
  Check if the tsconfig.json file in the current working directory is sorted.

    $ tbu sort tsconfig .

  Sort the tsconfig.json file in the current working directory.

    $ tbu sort tsconfig . --write

  Sort all tsconfig.json files under the packages directory.

    $ tbu sort tsconfig 'packages/**/tsconfig.json' --write
```

_See code: [src/commands/sort/tsconfig.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/sort/tsconfig.ts)_

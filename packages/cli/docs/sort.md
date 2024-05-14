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

ALIASES
  $ tbu sort tsconfigs
```

_See code: [src/commands/sort/tsconfig.ts](https://github.com/tylerbutler/tools-monorepo/blob/v0.2.1/src/commands/sort/tsconfig.ts)_

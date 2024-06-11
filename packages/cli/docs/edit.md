`tbu edit`
==========

Inspect or edit package.json properties using a CLI.

* [`tbu edit package PROPERTY [VALUE]`](#tbu-edit-package-property-value)

## `tbu edit package PROPERTY [VALUE]`

Inspect or edit package.json properties using a CLI.

```
USAGE
  $ tbu edit package PROPERTY [VALUE] [-v | --quiet] [--package <value>] [--onlyIfExists | --delete]

ARGUMENTS
  PROPERTY  The package.json property to inspect or edit.
  VALUE     The value to set the property to.

FLAGS
  --delete           Delete the property completely from the package.json.
  --onlyIfExists     Only update the property if it exists. This is useful when doing bulk operations on many packages,
                     some of which don't have the property.
  --package=<value>  [default: ./package.json] Path to the package.json file to edit.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

ALIASES
  $ tbu get package

EXAMPLES
  Check if the tsconfig.json file in the current working directory is sorted.

    $ tbu edit package .

  Sort the tsconfig.json file in the current working directory.

    $ tbu edit package . --write

  Sort all tsconfig.json files under the packages directory.

    $ tbu edit package 'packages/**/tsconfig.json' --write
```

_See code: [src/commands/edit/package.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/edit/package.ts)_

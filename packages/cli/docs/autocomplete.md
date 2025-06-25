`tbu autocomplete`
==================

Display autocomplete installation instructions.

* [`tbu autocomplete [SHELL]`](#tbu-autocomplete-shell)

## `tbu autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ tbu autocomplete [SHELL] [-r]

ARGUMENTS
  SHELL  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ tbu autocomplete

  $ tbu autocomplete bash

  $ tbu autocomplete zsh

  $ tbu autocomplete powershell

  $ tbu autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.27/src/commands/autocomplete/index.ts)_

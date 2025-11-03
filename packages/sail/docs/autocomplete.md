`sail autocomplete`
===================

Display autocomplete installation instructions.

* [`sail autocomplete [SHELL]`](#sail-autocomplete-shell)

## `sail autocomplete [SHELL]`

Display autocomplete installation instructions.

```
USAGE
  $ sail autocomplete [SHELL] [-r]

ARGUMENTS
  [SHELL]  (zsh|bash|powershell) Shell type

FLAGS
  -r, --refresh-cache  Refresh cache (ignores displaying instructions)

DESCRIPTION
  Display autocomplete installation instructions.

EXAMPLES
  $ sail autocomplete

  $ sail autocomplete bash

  $ sail autocomplete zsh

  $ sail autocomplete powershell

  $ sail autocomplete --refresh-cache
```

_See code: [@oclif/plugin-autocomplete](https://github.com/oclif/plugin-autocomplete/blob/v3.2.37/src/commands/autocomplete/index.ts)_

`tbu which`
===========

Show which plugin a command is in.

* [`tbu which`](#tbu-which)

## `tbu which`

Show which plugin a command is in.

```
USAGE
  $ tbu which [--json]

GLOBAL FLAGS
  --json  Format output as json.

DESCRIPTION
  Show which plugin a command is in.

EXAMPLES
  See which plugin the `help` command is in:

    $ tbu which help

  Use colon separators.

    $ tbu which foo:bar:baz

  Use spaces as separators.

    $ tbu which foo bar baz

  Wrap command in quotes to use spaces as separators.

    $ tbu which "foo bar baz"
```

_See code: [@oclif/plugin-which](https://github.com/oclif/plugin-which/blob/v3.2.14/src/commands/which.ts)_

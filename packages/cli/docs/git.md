`tbu git`
=========

Git-related commands.

* [`tbu git squish TARGET [SOURCE]`](#tbu-git-squish-target-source)

## `tbu git squish TARGET [SOURCE]`

Squash-merge a branch with another branch, and reset the source branch to the squash-merged HEAD. This process results in the branch containing a single commit on top of the target branch.

```
USAGE
  $ tbu git squish TARGET [SOURCE] [-v | --quiet] [--dry-run]

ARGUMENTS
  TARGET  [default: main] Branch to rebase on top of.
  SOURCE  Branch that should be squished. If not provided, the current branch is used.

FLAGS
  --dry-run  Don't make any changes.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Squash-merge a branch with another branch, and reset the source branch to the squash-merged HEAD. This process results
  in the branch containing a single commit on top of the target branch.
```

_See code: [src/commands/git/squish.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/git/squish.ts)_

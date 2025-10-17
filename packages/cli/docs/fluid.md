`tbu fluid`
===========

FluidFramework repository tools.

* [`tbu fluid repo-overlay TYPE`](#tbu-fluid-repo-overlay-type)

## `tbu fluid repo-overlay TYPE`

Apply overlay configurations to the FluidFramework repository

```
USAGE
  $ tbu fluid repo-overlay TYPE [-v | --quiet] [--repo-dir <value>] [--dry-run]

ARGUMENTS
  TYPE  (nx|turbo) Type of overlay to apply

FLAGS
  --dry-run           Show what would be changed without making changes
  --repo-dir=<value>  Path to the repository directory (defaults to current working directory)

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Apply overlay configurations to the FluidFramework repository
```

_See code: [src/commands/fluid/repo-overlay.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/fluid/repo-overlay.ts)_

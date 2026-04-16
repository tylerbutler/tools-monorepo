`tbu fluid`
===========

FluidFramework repository tools.

* [`tbu fluid repo-overlay TYPE`](#tbu-fluid-repo-overlay-type)
* [`tbu fluid task-rename`](#tbu-fluid-task-rename)

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

## `tbu fluid task-rename`

Rename package.json scripts to follow three-tier naming principles (Phase 1 of Nx/Turbo migration)

```
USAGE
  $ tbu fluid task-rename --repo-dir <value> [-v | --quiet] [--dry-run] [--validate-only] [--skip-cross-refs]

FLAGS
  --dry-run           Show changes without applying them
  --repo-dir=<value>  (required) Path to FluidFramework repository
  --skip-cross-refs   Don't update cross-references (faster, less safe)
  --validate-only     Check for naming issues without renaming

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Rename package.json scripts to follow three-tier naming principles (Phase 1 of Nx/Turbo migration)

EXAMPLES
  Dry run to see what would change

    $ tbu fluid task-rename --repo-dir test-fixtures/FluidFramework --dry-run

  Apply renames

    $ tbu fluid task-rename --repo-dir test-fixtures/FluidFramework

  Validation only (report issues)

    $ tbu fluid task-rename --repo-dir test-fixtures/FluidFramework --validate-only
```

_See code: [src/commands/fluid/task-rename.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/fluid/task-rename.ts)_

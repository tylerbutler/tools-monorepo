`tbu deps`
==========

Dependency management commands.

* [`tbu deps sync`](#tbu-deps-sync)

## `tbu deps sync`

Sync package.json dependency versions to match what's installed in the lockfile. This addresses a Dependabot bug where versioning-strategy: increase doesn't update package.json for dependencies with caret ranges (^) that already satisfy the new version. Supports npm, pnpm, yarn (partial), and bun (partial). See: https://github.com/dependabot/dependabot-core/issues/9020

```
USAGE
  $ tbu deps sync [-v | --quiet] [-x] [--json] [-l <value>] [--cwd <value>] [--package-manager
    npm|pnpm|yarn|bun]

FLAGS
  -l, --lockfile=<value>          Path to lockfile (auto-detects package-lock.json, pnpm-lock.yaml, yarn.lock, bun.lockb
                                  if not provided)
  -x, --execute                   Apply changes to package.json files (default: dry-run)
      --cwd=<value>               Working directory (default: current directory)
      --json                      Output results in JSON format
      --package-manager=<option>  Force specific package manager
                                  <options: npm|pnpm|yarn|bun>
      --quiet                     Minimal output (only show changes and errors)

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.

DESCRIPTION
  Sync package.json dependency versions to match what's installed in the lockfile. This addresses a Dependabot bug where
  versioning-strategy: increase doesn't update package.json for dependencies with caret ranges (^) that already satisfy
  the new version. Supports npm, pnpm, yarn (partial), and bun (partial). See:
  https://github.com/dependabot/dependabot-core/issues/9020

EXAMPLES
  Preview changes (dry-run mode, default)

    $ tbu deps sync

  Apply changes to package.json files

    $ tbu deps sync --execute

  Apply changes (short flag)

    $ tbu deps sync -x

  Work in specific directory

    $ tbu deps sync --cwd packages/my-package -x

  Use specific lockfile

    $ tbu deps sync --lockfile ./pnpm-lock.yaml -x

  Quiet mode for CI

    $ tbu deps sync -x --quiet

  JSON output

    $ tbu deps sync --json
```

_See code: [src/commands/deps/sync.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/deps/sync.ts)_

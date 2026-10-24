`tbu generate`
==============

Code and config generation commands.

* [`tbu generate commit-config`](#tbu-generate-commit-config)

## `tbu generate commit-config`

Generate cliff.toml and commitlint config from commit-types.ccl

```
USAGE
  $ tbu generate commit-config [-v | --quiet] [-n] [--cwd <value>]

FLAGS
  -n, --dry-run      Preview generated files without writing
      --cwd=<value>  [default: .] Target directory containing commit-types.ccl

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Generate cliff.toml and commitlint config from commit-types.ccl

EXAMPLES
  $ tbu generate commit-config

  $ tbu generate commit-config --dry-run

  $ tbu generate commit-config --cwd ../my-project
```

_See code: [src/commands/generate/commit-config.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/generate/commit-config.ts)_

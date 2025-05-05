`tbu generate`
==============



* [`tbu generate fluid-svelte`](#tbu-generate-fluid-svelte)

## `tbu generate fluid-svelte`

```
USAGE
  $ tbu generate fluid-svelte --class <value> --input <value> --output <value> [-v | --quiet] [--tsconfig <value>]
    [--dry-run]

FLAGS
  --class=<value>     (required) Name of class to use as base.
  --dry-run           Don't make any changes.
  --input=<value>     (required) File that contains the input class.
  --output=<value>    (required) Path to output file. Contents will be overwritten.
  --tsconfig=<value>  [default: ./tsconfig.json] Path to tsconfig.json file to use.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.
```

_See code: [src/commands/generate/fluid-svelte.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/generate/fluid-svelte.ts)_

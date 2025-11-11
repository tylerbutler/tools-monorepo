`sail scan`
===========

Scan a path to see it the way Sail sees it.

* [`sail scan [SCAN_DIR]`](#sail-scan-scan_dir)

## `sail scan [SCAN_DIR]`

Scan a path to see it the way Sail sees it.

```
USAGE
  $ sail scan [SCAN_DIR] [-v | --quiet] [--infer]

ARGUMENTS
  [SCAN_DIR]  [default: .] Directory to scan.

FLAGS
  --infer  Skip loading configuration from files. Instead the configuration will be inferred.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Scan a path to see it the way Sail sees it.
```

_See code: [src/commands/scan.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail/src/commands/scan.ts)_

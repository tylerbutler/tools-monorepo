---
title: CLI reference
---

<!-- commands -->
* [`dill URL`](#dill-url)

## `dill URL`

Downloads a file from a URL and optionally extracts its contents.

```
USAGE
  $ dill  URL [-v | --quiet] [-o <value>] [--filename <value> | -e]

ARGUMENTS
  URL  URL of the file to download.

FLAGS
  -e, --extract           Decompress the file and, if it's a tarball, extract its contents.
  -o, --out=<value>       Directory in which to place the downloaded files.
      --filename=<value>  Name to use for the downloaded file. Cannot be used with --extract.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Downloads a file from a URL and optionally extracts its contents.
```
<!-- commandsstop -->

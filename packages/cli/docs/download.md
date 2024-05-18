`tbu download`
==============

Downloads a file from a URL and optionally extracts its contents.

* [`tbu download [URL]`](#tbu-download-url)

## `tbu download [URL]`

Downloads a file from a URL and optionally extracts its contents.

```
USAGE
  $ tbu download [URL] [-v | --quiet] [-o <value>] [-s <value> -e] [--filename <value> | ]

ARGUMENTS
  URL  URL of the file to download.

FLAGS
  -e, --extract           Decompress the file and extract its contents.
  -o, --out=<value>       Directory in which to place the downloaded files.
  -s, --strip=<value>     Strip leading paths from file names during extraction.
      --filename=<value>  Name to use for the downloaded file.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Downloads a file from a URL and optionally extracts its contents.

ALIASES
  $ tbu dl
  $ tbu dill

EXAMPLES
  $ tbu download
```

_See code: [src/commands/download.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/cli/src/commands/download.ts)_

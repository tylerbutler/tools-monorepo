# dill - simple file download API and CLI

<!-- toc -->
* [dill - simple file download API and CLI](#dill---simple-file-download-api-and-cli)
* [Usage](#usage)
* [Commands](#commands)
<!-- tocstop -->
# Usage
<!-- usage -->
```sh-session
$ npm install -g dill
$ dill COMMAND
running command...
$ dill (--version)
dill/0.0.1 darwin-arm64 node-v18.20.2
$ dill --help [COMMAND]
USAGE
  $ dill COMMAND
...
```
<!-- usagestop -->
# Commands
<!-- commands -->
* [`dill download [URL]`](#dill-download-url)
* [`dill help [COMMAND]`](#dill-help-command)

## `dill download [URL]`

Downloads a file from a URL and optionally extracts its contents.

```
USAGE
  $ dill download [URL] [-v | --quiet] [-o <value>] [-s <value> -e] [--filename <value> | ]

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
  $ dill dl

EXAMPLES
  $ dill download
```

_See code: [src/commands/download.ts](https://github.com/tylerbutler/tools-monorepo/blob/v0.0.1/src/commands/download.ts)_

## `dill help [COMMAND]`

Display help for dill.

```
USAGE
  $ dill help [COMMAND...] [-n]

ARGUMENTS
  COMMAND...  Command to show help for.

FLAGS
  -n, --nested-commands  Include all nested commands in the output.

DESCRIPTION
  Display help for dill.
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v6.0.22/src/commands/help.ts)_
<!-- commandsstop -->

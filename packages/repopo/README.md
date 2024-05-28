# dill - simple file download CLI and API

![An anthropomorphic dill pickle in a doorman's uniform](https://tylerbutlerpublic.blob.core.windows.net/public-storage/dill-logo.jpg)

dill is a CLI app to download files and optionally decompress their contents. It also provides a simple programmatic
API.

Implementation-wise, dill uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) via
[node-fetch-native](https://github.com/unjs/node-fetch-native) to download files, which means it is reasonably
cross-platform and will use native Fetch implementations where available.

<!-- toc -->
* [dill - simple file download CLI and API](#dill---simple-file-download-cli-and-api)
* [Why?](#why)
* [Usage](#usage)
<!-- tocstop -->

# Why?

dill is intended for use in CI/CD systems for TypeScript/JavaScript projects. It fills a similar need to curl or wget --
a straightforward way to download a file given its URL.

In TypeScript/JavaScript projects, dependencies are typically specified using package.json, and thus it's most
convenient to use only things that can be specified and installed using package.json. Moreover, dill is written in
TypeScript and doesn't have any direct native dependencies. Thus, dill enables you to run the same build process locally
as in CI/CD.

# Usage

<!-- commands -->
* [`repopo check`](#repopo-check)

## `repopo check`

Checks and applies policies to the files in the repository.

```
USAGE
  $ repopo check [-v | --quiet] [-f] [-D <value> | -d <value>] [-p <value>] [--stdin]

FLAGS
  -D, --excludePolicy=<value>...  Exclude policies by name. Can be specified multiple times to exclude multiple
                                  policies.
  -d, --policy=<value>            Filter policies to apply by <regex>. Only policies with a name matching the regex will
                                  be applied.
  -f, --fix                       Fix errors if possible.
  -p, --path=<value>              Filter file paths by <regex>.
      --stdin                     Read list of files from stdin.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.
```

_See code: [src/commands/check.ts](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/repopo/src/commands/check.ts)_
<!-- commandsstop -->

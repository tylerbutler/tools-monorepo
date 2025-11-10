# dill - download and decompress gzipped tar files with a CLI and API

![An anthropomorphic dill pickle in a doorman's uniform](https://raw.githubusercontent.com/tylerbutler/tools-monorepo/main/packages/dill-docs/src/assets/dill-logo.svg)

**dill** is a CLI app to download gzipped files and optionally decompress their contents. It also provides a simple programmatic
API.

Implementation-wise, dill uses the [Fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) to download
files, which means it should be usable anywhere the Fetch API is available.

<!-- toc -->
* [dill - download and decompress gzipped tar files with a CLI and API](#dill---download-and-decompress-gzipped-tar-files-with-a-cli-and-api)
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
* [`dill URL`](#dill-url)

## `dill URL`

Downloads a file from a URL and optionally extracts its contents.

```
USAGE
  $ dill  URL [-v | --quiet] [-o <value>] [--filename <value> | -e] [-H <value>...] [-s <value> ]

ARGUMENTS
  URL  URL of the file to download.

FLAGS
  -H, --header=<value>...  Custom header to include in the fetch request. Format: 'Name: Value'. Can be used multiple
                           times.
  -e, --extract            Decompress the file and, if it's a tarball, extract its contents.
  -o, --out=<value>        Directory in which to place the downloaded files.
  -s, --strip=<value>      Strip leading paths from file names during extraction. Only works with --extract.
      --filename=<value>   Name to use for the downloaded file. Cannot be used with --extract.

LOGGING FLAGS
  -v, --verbose  Enable verbose logging.
      --quiet    Disable all logging.

DESCRIPTION
  Downloads a file from a URL and optionally extracts its contents.
```
<!-- commandsstop -->

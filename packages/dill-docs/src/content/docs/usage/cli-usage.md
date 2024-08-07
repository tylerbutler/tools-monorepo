---
title: Using dill as a command-line tool
sidebar:
  order: 1
---

To use dill, [install it](/installation) then run `dill [URL]` in a terminal to download a file. You can use 
`dill --help` to see the [full usage info](/cli-reference).

## Download a file

The following command will download a JSON file named `test1.json` to the current directory.

```shell
$ dill https://github.com/tylerbutler/tools-monorepo/raw/main/packages/dill/test/data/test1.json
```

## Download a tarball and extract it to a folder

The following command will download tarball and extract its contents to the current directory.

```shell
$ dill https://github.com/tylerbutler/tools-monorepo/raw/main/packages/dill/test/data/tarball2.tar.gz --extract
```

### Extract to a specific folder

You can also extract the tarball to a different folder using the `--out` flag.

```shell
$ dill https://github.com/tylerbutler/tools-monorepo/raw/main/packages/dill/test/data/tarball2.tar.gz --extract --out folder
```

## Decompress a single gzipped file

```shell
$ dill https://github.com/tylerbutler/tools-monorepo/raw/main/packages/dill/test/data/test5.json.gz --extract
```
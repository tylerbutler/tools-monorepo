[**@tylerbu/fundamentals**](../../README.md) • **Docs**

***

[@tylerbu/fundamentals](../../modules.md) / [git](../README.md) / findGitRootSync

# Function: findGitRootSync()

> **findGitRootSync**(`cwd`): `string`

Finds the root directory of a Git repository synchronously.

This function uses `git rev-parse --show-toplevel` command to find the top-level directory
of the current Git repository. It executes the command synchronously using `child_process.execFileSync`.
If the current directory is not part of a Git repository, it throws an error.

## Parameters

• **cwd**: `string` = `...`

The current working directory from which to start searching for a Git repository root.

## Returns

`string`

The path to the root directory of the Git repository.

## Throws

Error If the current directory is not part of a Git repository.

## Defined in

[git.ts:17](https://github.com/tylerbutler/tools-monorepo/blob/e5c9b5f5c8bbad1b778226ca5d92ed07cf78f962/packages/fundamentals/src/git.ts#L17)

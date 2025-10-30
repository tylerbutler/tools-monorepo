[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / findGitRootSync

# Function: findGitRootSync()

```ts
function findGitRootSync(cwd): string;
```

Defined in: packages/sail-infrastructure/src/git.ts:33

Returns the absolute path to the nearest Git repository root found starting at `cwd`.

## Parameters

### cwd

`string` = `...`

The working directory to use to start searching for Git repositories. Defaults to `process.cwd()` if not
provided.

## Returns

`string`

## Throws

A `NotInGitRepository` error if no git repo is found.

[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / getFiles

# Function: getFiles()

```ts
function getFiles(git, directory): Promise<string[]>;
```

Defined in: [packages/sail-infrastructure/src/git.ts:222](https://github.com/tylerbutler/tools-monorepo/blob/main/packages/sail-infrastructure/src/git.ts#L222)

Returns an array containing repo repo-relative paths to all the files in the provided directory.
A given path will only be included once in the array; that is, there will be no duplicate paths.
Note that this function excludes files that are deleted locally whether the deletion is staged or not.

## Parameters

### git

`SimpleGit`

### directory

`string`

A directory to filter the results by. Only files under this directory will be returned. To
return all files in the repo use the value `"."`.

## Returns

`Promise`\<`string`[]\>

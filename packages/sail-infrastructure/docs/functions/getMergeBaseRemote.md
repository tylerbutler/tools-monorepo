[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / getMergeBaseRemote

# Function: getMergeBaseRemote()

```ts
function getMergeBaseRemote(
   git, 
   branch, 
   remote?, 
localRef?): Promise<string>;
```

Defined in: [packages/sail-infrastructure/src/git.ts:62](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/git.ts#L62)

Get the merge base between the current HEAD and a remote branch.

## Parameters

### git

`SimpleGit`

### branch

`string`

The branch to compare against.

### remote?

`string`

The remote to compare against. If this is undefined, then the local branch is compared with.

### localRef?

`string` = `"HEAD"`

The local ref to compare against. Defaults to HEAD.

## Returns

`Promise`\<`string`\>

The ref of the merge base between the current HEAD and the remote branch.

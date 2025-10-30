[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / getRemote

# Function: getRemote()

```ts
function getRemote(git, partialUrl): Promise<string | undefined>;
```

Defined in: [packages/sail-infrastructure/src/git.ts:192](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/git.ts#L192)

Get a matching git remote name based on a partial URL to the remote repo. It will match the first remote that
contains the partialUrl case insensitively.

## Parameters

### git

`SimpleGit`

### partialUrl

partial URL to match case insensitively

`string` | `undefined`

## Returns

`Promise`\<`string` \| `undefined`\>

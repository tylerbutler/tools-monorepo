[**@tylerbu/sail-infrastructure**](../README.md)

***

[@tylerbu/sail-infrastructure](../README.md) / getChangedSinceRef

# Function: getChangedSinceRef()

```ts
function getChangedSinceRef<P>(
   buildProject, 
   ref, 
   remote?): Promise<{
  dirs: string[];
  files: string[];
  packages: P[];
  releaseGroups: IReleaseGroup[];
  workspaces: IWorkspace[];
}>;
```

Defined in: [packages/sail-infrastructure/src/git.ts:133](https://github.com/microsoft/FluidFramework/blob/main/packages/sail-infrastructure/src/git.ts#L133)

Gets the changed files, directories, release groups, and packages since the given ref.

Returned paths are relative to the BuildProject root.

## Type Parameters

### P

`P` *extends* [`IPackage`](../interfaces/IPackage.md)\<[`PackageJson`](../type-aliases/PackageJson.md)\>

## Parameters

### buildProject

[`IBuildProject`](../interfaces/IBuildProject.md)\<`P`\>

The BuildProject.

### ref

`string`

The ref to compare against.

### remote?

`string`

The remote to compare against.

## Returns

`Promise`\<\{
  `dirs`: `string`[];
  `files`: `string`[];
  `packages`: `P`[];
  `releaseGroups`: [`IReleaseGroup`](../interfaces/IReleaseGroup.md)[];
  `workspaces`: [`IWorkspace`](../interfaces/IWorkspace.md)[];
\}\>

An object containing the changed files, directories, release groups, workspaces, and packages. Note that a
package may appear in multiple groups. That is, if a single package in a release group is changed, the releaseGroups
value will contain that group, and the packages value will contain only the single package. Also, if two packages are
changed, each within separate release groups, the packages value will contain both packages, and the releaseGroups
value will contain both release groups.

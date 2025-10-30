/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import type { SimpleGit } from "simple-git";
import type { IBuildProject, IPackage, IReleaseGroup, IWorkspace } from "./types.js";
/**
 * Returns the absolute path to the nearest Git repository root found starting at `cwd`.
 *
 * @param cwd - The working directory to use to start searching for Git repositories. Defaults to `process.cwd()` if not
 * provided.
 *
 * @throws A `NotInGitRepository` error if no git repo is found.
 *
 * @privateRemarks
 * This function is helpful because it is synchronous. The SimpleGit wrapper is async-only.
 */
export declare function findGitRootSync(cwd?: string): string;
/**
 * Get the merge base between the current HEAD and a remote branch.
 *
 * @param branch - The branch to compare against.
 * @param remote - The remote to compare against. If this is undefined, then the local branch is compared with.
 * @param localRef - The local ref to compare against. Defaults to HEAD.
 * @returns The ref of the merge base between the current HEAD and the remote branch.
 */
export declare function getMergeBaseRemote(git: SimpleGit, branch: string, remote?: string, localRef?: string): Promise<string>;
/**
 * Gets all the files that have changed when compared to another ref. Paths are relative to the root of the git
 * repository.
 *
 * Note that newly added, unstaged files are NOT included.
 */
export declare function getChangedFilesSinceRef(git: SimpleGit, ref: string, remote?: string): Promise<string[]>;
/**
 * Gets the changed files, directories, release groups, and packages since the given ref.
 *
 * Returned paths are relative to the BuildProject root.
 *
 * @param buildProject - The BuildProject.
 * @param ref - The ref to compare against.
 * @param remote - The remote to compare against.
 * @returns An object containing the changed files, directories, release groups, workspaces, and packages. Note that a
 * package may appear in multiple groups. That is, if a single package in a release group is changed, the releaseGroups
 * value will contain that group, and the packages value will contain only the single package. Also, if two packages are
 * changed, each within separate release groups, the packages value will contain both packages, and the releaseGroups
 * value will contain both release groups.
 */
export declare function getChangedSinceRef<P extends IPackage>(buildProject: IBuildProject<P>, ref: string, remote?: string): Promise<{
    files: string[];
    dirs: string[];
    workspaces: IWorkspace[];
    releaseGroups: IReleaseGroup[];
    packages: P[];
}>;
/**
 * Get a matching git remote name based on a partial URL to the remote repo. It will match the first remote that
 * contains the partialUrl case insensitively.
 *
 * @param partialUrl - partial URL to match case insensitively
 */
export declare function getRemote(git: SimpleGit, partialUrl: string | undefined): Promise<string | undefined>;
/**
 * Returns an array containing repo repo-relative paths to all the files in the provided directory.
 * A given path will only be included once in the array; that is, there will be no duplicate paths.
 * Note that this function excludes files that are deleted locally whether the deletion is staged or not.
 *
 * @param directory - A directory to filter the results by. Only files under this directory will be returned. To
 * return all files in the repo use the value `"."`.
 */
export declare function getFiles(git: SimpleGit, directory: string): Promise<string[]>;
//# sourceMappingURL=git.d.ts.map
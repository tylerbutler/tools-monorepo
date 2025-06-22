import process from "node:process";
import { dirname } from "pathe";
import {
	type MergeResult,
	ResetMode,
	type SimpleGit,
	type SimpleGitOptions,
	simpleGit,
} from "simple-git";
import type { SetRequired } from "type-fest";
import type { Logger } from "./logger.js";

/**
 * Default options passed to the git client.
 */
const defaultGitOptions: Partial<SimpleGitOptions> = {
	binary: "git",
	maxConcurrentProcesses: 6,
	trimmed: true,
};

/**
 * A small wrapper around a git repo to provide API access to it.
 *
 * @public
 */
export class Repository {
	private readonly git: SimpleGit;

	/**
	 * A git client for the repository that can be used to call git directly.
	 */
	public get gitClient(): SimpleGit {
		return this.git;
	}

	public constructor(
		gitOptions: SetRequired<Partial<SimpleGitOptions>, "baseDir">,
	) {
		const options: SetRequired<Partial<SimpleGitOptions>, "baseDir"> = {
			...gitOptions,
			...defaultGitOptions,
		};
		this.git = simpleGit(options);
	}
}

/**
 * Get the remote based on the partial Url. It will match the first remote that contains the partialUrl case
 * insensitively.
 *
 * @param partialUrl - partial url to match case insensitively
 *
 * @alpha
 */
export async function getRemote(
	git: SimpleGit,
	partialUrl: string,
): Promise<string | undefined> {
	const lowerPartialUrl = partialUrl.toLowerCase();
	const remotes = await git.getRemotes(/* verbose */ true);

	for (const r of remotes) {
		if (r.refs.fetch.toLowerCase().includes(lowerPartialUrl)) {
			return r.name;
		}
	}
}

/**
 * Finds the merge base between a local ref (default is HEAD) and a remote branch.
 *
 * @param branch - The branch to compare against.
 * @param remote - The remote to compare against.
 * @param localRef - The local ref to compare against. Defaults to HEAD.
 * @returns The ref of the merge base between the current HEAD and the remote branch.
 *
 * @beta
 */
export async function getMergeBaseRemote(
	git: SimpleGit,
	branch: string,
	remote: string,
	localReference = "HEAD",
): Promise<string> {
	const base = await git
		.fetch(["--all"]) // make sure we have the latest remote refs
		.raw("merge-base", `refs/remotes/${remote}/${branch}`, localReference);
	return base;
}

/**
 * @param ref1 - The first ref to compare.
 * @param ref2 - The ref to compare against.
 * @returns The ref of the merge base between the two refs.
 *
 * @beta
 */
export async function getMergeBase(
	git: SimpleGit,
	reference1: string,
	reference2: string,
): Promise<string> {
	const base = await git.raw("merge-base", `${reference1}`, reference2);
	return base;
}

/**
 * Gets all files that have changed since a specific reference point.
 *
 * @param git - The SimpleGit instance to use for git operations
 * @param reference - The branch name to compare against
 * @param remote - The remote name to compare against
 * @returns A promise that resolves to an array of changed file paths
 *
 * @beta
 */
export async function getChangedFilesSinceRef(
	git: SimpleGit,
	reference: string,
	remote: string,
): Promise<string[]> {
	const divergedAt = await getMergeBaseRemote(git, reference, remote);
	// Now we can find which files we added
	const added = await git
		.fetch(["--all"]) // make sure we have the latest remote refs
		.diff(["--name-only", "--diff-filter=d", divergedAt]);

	const files = added.split("\n").filter((value) => value !== "");
	return files;
}

/**
 * Gets all directories that contain files that have changed since a specific reference point.
 *
 * @param git - The SimpleGit instance to use for git operations
 * @param reference - The branch name to compare against
 * @param remote - The remote name to compare against
 * @returns A promise that resolves to an array of changed directory paths
 *
 * @beta
 */
export async function getChangedDirectoriesSinceRef(
	git: SimpleGit,
	reference: string,
	remote: string,
): Promise<string[]> {
	const files = await getChangedFilesSinceRef(git, reference, remote);
	const directories = new Set(files.map((f) => dirname(f)));
	return [...directories];
}

/**
 * Returns the SHA hash for a branch. If a remote is provided, the SHA for the remote ref is returned.
 *
 * @param git - The SimpleGit instance to use for git operations
 * @param branch - The branch name to get the SHA for
 * @param remote - Optional remote name. If provided, gets the SHA for the remote branch
 * @returns A promise that resolves to the SHA hash of the branch
 *
 * @beta
 */
export async function getShaForBranch(
	git: SimpleGit,
	branch: string,
	remote?: string,
): Promise<string> {
	const refspec =
		remote === undefined
			? `refs/heads/${branch}`
			: `refs/remotes/${remote}/${branch}`;
	const result = await git.raw("show-ref", refspec);

	return result;
}

const newlinePattern = /\r?\n/;

/**
 * Calls `git rev-list` to get all commits between the base and head commits.
 *
 * @param baseCommit - The base commit.
 * @param headCommit - The head commit. Defaults to HEAD.
 * @returns An array of all commits between the base and head commits.
 *
 * @alpha
 */
export async function revList(
	git: SimpleGit,
	baseCommit: string,
	headCommit = "HEAD",
): Promise<string[]> {
	const result = await git.raw("rev-list", `${baseCommit}..${headCommit}`);
	return result.split(newlinePattern).filter((value) => value !== "");
}

/**
 * Tests whether a commit can be merged without conflicts.
 *
 * @param git - The SimpleGit instance to use for git operations
 * @param commit - The commit SHA or reference to test merging
 * @returns A promise that resolves to true if the commit can be merged without conflicts
 *
 * @beta
 */
export async function canMergeWithoutConflicts(
	git: SimpleGit,
	commit: string,
): Promise<boolean> {
	// const mergeResult = await git.merge([commit, "--no-commit"]);
	// await git.merge(["--abort"]);
	// const canMerge = mergeResult.result === "success";
	// return canMerge;

	let mergeResult: MergeResult;
	try {
		mergeResult = await git.merge([commit, "--no-commit", "--no-ff"]);
		// await git.merge(["--abort"]);
	} catch {
		// await git.merge(["--abort"]);
		return false;
	}

	return mergeResult.result === "success";
}

/**
 * Tests whether a commit can be cherry-picked without conflicts.
 *
 * @param git - The SimpleGit instance to use for git operations
 * @param commit - The commit SHA or reference to test cherry-picking
 * @returns A promise that resolves to true if the commit can be cherry-picked without conflicts
 *
 * @beta
 */
export async function canCherryPickWithoutConflicts(
	git: SimpleGit,
	commit: string,
): Promise<boolean> {
	// const result = await git.raw("cherry-pick", commit, "--no-commit");
	// await git.reset(ResetMode.HARD);
	// return result === "success";
	try {
		await git.raw("cherry-pick", commit, "--no-commit");
		await git.reset(ResetMode.HARD);
		return true;
	} catch {
		await git.reset(ResetMode.HARD);
		return false;
	}
}

/**
 * Describes the mergeability status of a commit.
 * - "clean": Can be merged without conflicts
 * - "conflict": Cannot be merged or cherry-picked without conflicts
 * - "maybeClean": Cannot be merged but can be cherry-picked without conflicts
 *
 * @beta
 */
export type CommitMergeability = "clean" | "conflict" | "maybeClean";

/**
 * Checks multiple commits for merge conflicts and categorizes their mergeability.
 *
 * @param git - The SimpleGit instance to use for git operations
 * @param commitIds - Array of commit SHAs or references to check
 * @param log - Optional logger for verbose output
 * @returns A promise that resolves to an array of commit mergeability results
 *
 * @beta
 */
export async function checkConflicts(
	git: SimpleGit,
	commitIds: string[],
	log?: Logger,
): Promise<{ commit: string; mergeability: CommitMergeability }[]> {
	const results: { commit: string; mergeability: CommitMergeability }[] = [];
	for (const commit of commitIds) {
		const mergesClean = await canMergeWithoutConflicts(git, commit);
		log?.verbose(`Can merge without conflicts ${commit}: ${mergesClean}`);
		if (mergesClean) {
			results.push({ commit, mergeability: "clean" });
		} else {
			const cherryPicksClean = await canCherryPickWithoutConflicts(git, commit);
			if (cherryPicksClean) {
				results.push({ commit, mergeability: "maybeClean" });
			} else {
				results.push({ commit, mergeability: "conflict" });
			}
		}
	}

	return results;
}

/**
 * Shortens a commit sha to seven characters.
 *
 * @returns The shortened commit.
 *
 * @public
 */
export function shortCommit(commit: string): string {
	return commit.slice(0, 7);
}

/**
 * @beta
 */
export async function findGitRoot(cwd = process.cwd()): Promise<string> {
	const rootPath = await simpleGit({ baseDir: cwd }).revparse([
		"--show-toplevel",
	]);
	return rootPath;
}

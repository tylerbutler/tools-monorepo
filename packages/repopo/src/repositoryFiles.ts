import type { SimpleGit } from "simple-git";

/** Split Git's NUL-delimited paths without changing literal filename characters. @internal */
export function splitGitPaths(output: string): string[] {
	return output.split("\0").filter((path) => path !== "");
}

/** Git's cached inventory includes unstaged deletions; those are not live files. */
export async function readRepositoryFiles(git: SimpleGit): Promise<string[]> {
	const files = splitGitPaths(
		await git.raw("ls-files", "-co", "-z", "--exclude-standard", "--full-name"),
	);
	const deleted = new Set(
		splitGitPaths(await git.raw("ls-files", "--deleted", "-z", "--full-name")),
	);
	return files.filter((file) => !deleted.has(file));
}

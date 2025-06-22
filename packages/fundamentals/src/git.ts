import { execFileSync } from "node:child_process";

/**
 * Finds the root directory of a Git repository synchronously.
 *
 * This function uses `git rev-parse --show-toplevel` command to find the top-level directory
 * of the current Git repository. It executes the command synchronously using `child_process.execFileSync`.
 * If the current directory is not part of a Git repository, it throws an error.
 *
 * @param cwd - The current working directory from which to start searching for a Git repository root.
 * @returns The path to the root directory of the Git repository.
 * @throws Error If the current directory is not part of a Git repository.
 *
 * @public
 */
export function findGitRootSync(cwd: string = process.cwd()): string {
	try {
		const rootPath = execFileSync("git", ["rev-parse", "--show-toplevel"], {
			cwd,
			encoding: "utf8",
		}).trim();
		return rootPath;
	} catch (error) {
		throw new Error(
			`Failed to find Git repository root. Make sure you are inside a Git repository. Error: ${error}`,
		);
	}
}

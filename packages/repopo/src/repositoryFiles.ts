import type { SimpleGit } from "simple-git";
import { parseFilePaths } from "./filePaths.js";

/** Git's cached inventory includes unstaged deletions; those are not live files. */
export async function readRepositoryFiles(git: SimpleGit): Promise<string[]> {
	const files = parseFilePaths(
		await git.raw("ls-files", "-co", "-z", "--exclude-standard", "--full-name"),
	);
	const deleted = new Set(
		parseFilePaths(await git.raw("ls-files", "--deleted", "-z", "--full-name")),
	);
	return files.filter((file) => !deleted.has(file));
}

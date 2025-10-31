import { exec } from "./utils.js";

const LINE_BREAK_REGEX = /\r?\n/;
const DELETED_FILE_REGEX = /^.?D /;

/**
 * @deprecated Should not be used outside the build-tools package.
 */
export class GitRepo {
	public constructor(public readonly resolvedRoot: string) {}

	public async getCurrentSha() {
		const result = await this.exec("rev-parse HEAD", "get current sha");
		return result.split(LINE_BREAK_REGEX)[0];
	}

	/**
	 * Returns a set containing repo root-relative paths to files that are deleted in the working tree.
	 */
	public async getDeletedFiles(): Promise<Set<string>> {
		const results = await this.exec("status --porcelain", "get deleted files");
		const allStatus = results.split("\n");
		// Deleted files are marked with D in the first (staged) or second (unstaged) column.
		// If a file is deleted in staged and then revived in unstaged, it will have two entries.
		// The first entry will be "D " and the second entry will be "??". Look for unstaged
		// files and remove them from deleted set.
		const deletedFiles = new Set(
			allStatus
				.filter((t) => t.match(DELETED_FILE_REGEX))
				.map((t) => t.substring(3)),
		);
		const untrackedFiles = allStatus
			.filter((t) => t.startsWith("??"))
			.map((t) => t.substring(3));
		for (const untrackedFile of untrackedFiles) {
			deletedFiles.delete(untrackedFile);
		}
		return deletedFiles;
	}

	/**
	 * Returns an array containing repo repo-relative paths to all the files in the provided directory.
	 * A given path will only be included once in the array; that is, there will be no duplicate paths.
	 * Note that this function excludes files that are deleted locally whether the deletion is staged or not.
	 *
	 * @param directory - A directory to filter the results by. Only files under this directory will be returned. To
	 * return all files in the repo use the value `"."`.
	 */
	public async getFiles(directory: string): Promise<string[]> {
		/**
		 * What these git ls-files flags do:
		 *
		 * ```
		 * --cached: Includes cached (staged) files.
		 * --others: Includes other (untracked) files that are not ignored.
		 * --exclude-standard: Excludes files that are ignored by standard ignore rules.
		 * --full-name: Shows the full path of the files relative to the repository root.
		 * ```
		 *
		 * Note that `--deduplicate` is not used here because it is not available until git version 2.31.0.
		 */
		const command = `ls-files --cached --others --exclude-standard --full-name ${directory}`;
		const [fileResults, deletedFiles] = await Promise.all([
			this.exec(command, "get files"),
			this.getDeletedFiles(),
		]);

		// Deduplicate the list of files by building a Set.
		// This includes paths to deleted, unstaged files, so we get the list of deleted files from git status and remove
		// those from the full list.
		const allFiles = new Set(
			fileResults
				.split("\n")
				.map((line) => line.trim())
				// filter out empty lines
				.filter((line) => line !== ""),
		);

		for (const deletedFile of deletedFiles) {
			allFiles.delete(deletedFile);
		}

		// Files are already repo root-relative
		return [...allFiles];
	}

	/**
	 * Execute git command
	 *
	 * @param command the git command
	 * @param error description of command line to print when error happens
	 */
	public async exec(command: string, error: string, pipeStdIn?: string) {
		return exec(`git ${command}`, this.resolvedRoot, error, pipeStdIn, {
			// Some git commands, like diff can have quite large output when there are very large changes like a pending merge with main.
			// To mitigate this, increase the maxBuffer size from its default (1 mb at time of writing).
			// https://nodejs.org/api/child_process.html#child_process_child_process_exec_command_options_callback
			maxBuffer: 1024 * 1024 * 100,
		});
	}
}

import { env } from "node:process";
import { simpleGit } from "simple-git";
import type { RepopoConfig } from "./config.js";
import { readRepositoryFiles, splitGitPaths } from "./repositoryFiles.js";

type Git = ReturnType<typeof simpleGit>;

type ChangeOptions = NonNullable<RepopoConfig["changes"]>;

/** Repo-relative Git paths; renames retain both endpoints. @public */
export type RepositoryFile = (
	| {
			readonly status:
				| "unchanged"
				| "added"
				| "modified"
				| "deleted"
				| "type-changed";
			readonly path: string;
	  }
	| {
			readonly status: "renamed";
			readonly path: string;
			readonly previousPath: string;
	  }
) & {
	/** Working-tree presence when it differs from status (for example an unstaged deletion in PR mode). */
	readonly exists?: boolean | undefined;
};

/** Validate options independently of whether a policy requests changes. @internal */
export function validateChangeOptions(options: ChangeOptions): void {
	if (
		options.mode !== undefined &&
		!["pr", "local", "staged"].includes(options.mode)
	) {
		throw new TypeError("Change mode must be pr, local, or staged.");
	}
	if (options.base !== undefined && (options.mode ?? "pr") !== "pr") {
		throw new TypeError("A change base is only valid in pr mode.");
	}
	if (
		options.base !== undefined &&
		(typeof options.base !== "string" || options.base.trim() === "")
	) {
		throw new TypeError("Change branch references must be nonempty strings.");
	}
}

function parseChanges(output: string): RepositoryFile[] {
	const tokens = splitGitPaths(output);
	const entries: RepositoryFile[] = [];
	for (let index = 0; index < tokens.length; ) {
		const status = tokens[index++];
		const path = tokens[index++];
		if (!path) {
			throw new Error("Invalid Git name-status output: missing path.");
		}
		if (status?.startsWith("R")) {
			const destination = tokens[index++];
			if (!destination) {
				throw new Error("Invalid Git rename output: missing destination.");
			}
			entries.push({
				status: "renamed",
				previousPath: path,
				path: destination,
			});
		} else {
			switch (status) {
				case "A":
					entries.push({ status: "added", path });
					break;
				case "M":
					entries.push({ status: "modified", path });
					break;
				case "D":
					entries.push({ status: "deleted", path });
					break;
				case "T":
					entries.push({ status: "type-changed", path });
					break;
				default:
					throw new Error(`Unsupported Git change status: ${status}`);
			}
		}
	}
	return entries;
}

/** Normalize legacy paths and copy records before policies can observe them. @internal */
export function snapshotInventory(
	files: readonly (string | RepositoryFile)[],
): readonly RepositoryFile[] {
	return Object.freeze(
		files.map((file) =>
			Object.freeze(
				typeof file === "string"
					? { path: file, status: "unchanged" as const }
					: { ...file },
			),
		),
	);
}

/** Derive the legacy working-tree inventory, excluding absent paths. @internal */
export function inventoryPaths(entries: readonly RepositoryFile[]): string[] {
	return [
		...new Set(
			entries
				.filter((entry) => entry.exists ?? entry.status !== "deleted")
				.map((entry) => entry.path),
		),
	];
}

/** Refresh live paths without changing the statuses captured before fixes. @internal */
export function annotateInventory(
	files: readonly string[],
	snapshot: readonly RepositoryFile[],
): readonly RepositoryFile[] {
	const present = new Set(files);
	const changed = snapshot.filter((entry) => entry.status !== "unchanged");
	const changedPaths = new Set(changed.map((entry) => entry.path));
	return snapshotInventory([
		...files
			.filter((path) => !changedPaths.has(path))
			.map((path) => ({ path, status: "unchanged" as const })),
		...changed.map((entry) => ({
			...entry,
			exists: present.has(entry.path),
		})),
	]);
}

/** Collect the full inventory with Git statuses; does not fetch or require an actual pull request. @public */
export async function collectRepositoryInventory(
	root: string,
	options: NonNullable<RepopoConfig["changes"]> = {},
): Promise<readonly RepositoryFile[]> {
	validateChangeOptions(options);
	const mode = options.mode ?? "pr";
	const git = simpleGit({ baseDir: root });
	if (await git.raw(["ls-files", "--unmerged", "-z"])) {
		throw new Error(
			"Cannot collect repository changes with unresolved Git conflicts.",
		);
	}
	// symbolic HEAD exists before the first commit, but no HEAD object does.
	const unborn = !(await git.raw(["rev-parse", "--revs-only", "HEAD"])).trim();
	const head = unborn
		? undefined
		: (await git.revparse(["--verify", "HEAD^{commit}"])).trim();
	if (mode === "pr") {
		if (!head) {
			throw new Error(
				"PR changes require a HEAD commit. Use staged/local mode for an unborn repository.",
			);
		}
		return annotateInventory(
			await readRepositoryFiles(git),
			await collectPrChanges(git, head, options),
		);
	}
	const entries = await collectWorkingChanges(git, mode, head);
	return annotateInventory(await readRepositoryFiles(git), entries);
}

async function resolveTarget(
	git: Git,
	options: ChangeOptions,
): Promise<string> {
	const target =
		options.base ??
		(env.GITHUB_BASE_REF || env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME);
	if (!target) {
		throw new Error(
			"Cannot determine PR target. Set changes.base or --change-base.",
		);
	}
	// Enumerate refs rather than masking errors from failed Git subprocesses.
	const refs = (await git.raw(["for-each-ref", "--format=%(refname)"]))
		.trim()
		.split("\n");
	if (target.startsWith("refs/")) {
		return target;
	}
	const candidates = [`refs/heads/${target}`, `refs/remotes/origin/${target}`];
	return candidates.find((candidate) => refs.includes(candidate)) ?? target;
}

async function collectPrChanges(
	git: Git,
	head: string,
	options: ChangeOptions,
): Promise<RepositoryFile[]> {
	const target = await resolveTarget(git, options);
	let output: string;
	try {
		output = await git.raw([
			"diff",
			"--merge-base",
			"--name-status",
			"-z",
			"--find-renames",
			"--no-ext-diff",
			"--end-of-options",
			target,
			head,
			"--",
		]);
	} catch (cause) {
		throw new Error(
			`Cannot resolve PR base '${target}' and its merge base with HEAD. Set --change-base or fetch the missing branch/history.`,
			{ cause },
		);
	}
	return parseChanges(output);
}

async function collectWorkingChanges(
	git: Git,
	mode: "local" | "staged",
	head: string | undefined,
): Promise<RepositoryFile[]> {
	if (!head && mode === "local") {
		return (await readRepositoryFiles(git)).map((path) => ({
			status: "added",
			path,
		}));
	}
	const entries = parseChanges(
		await git.raw([
			"diff",
			"--name-status",
			"-z",
			"--find-renames",
			"--no-ext-diff",
			...(mode === "staged" ? ["--cached"] : []),
			...(head ? [head] : []),
			"--",
		]),
	);
	if (mode === "local") {
		for (const path of splitGitPaths(
			await git.raw(["ls-files", "--others", "--exclude-standard", "-z"]),
		)) {
			entries.push({ status: "added", path });
		}
	}
	return entries;
}

import { env } from "node:process";
import { simpleGit } from "simple-git";

type Git = ReturnType<typeof simpleGit>;

/** Git states supported by change-aware policies. @public */
export type ChangeMode = "pr" | "local" | "staged";

/** Repo-relative Git paths; renames retain both endpoints. @public */
export type RepositoryChange =
	| {
			readonly status: "added" | "modified" | "deleted" | "type-changed";
			readonly path: string;
	  }
	| {
			readonly status: "renamed";
			readonly path: string;
			readonly oldPath: string;
	  };

/** A fixed path snapshot, not a source of index or commit file contents. @public */
export interface RepositoryChangeSet {
	readonly mode: ChangeMode;
	readonly head?: string | undefined;
	readonly base?: string | undefined;
	readonly mergeBase?: string | undefined;
	readonly entries: readonly RepositoryChange[];
}

/** PR comparison defaults; explicit base takes precedence over CI targets. @public */
export interface RepositoryChangeOptions {
	mode?: ChangeMode | undefined;
	base?: string | undefined;
	defaultBranch?: string | undefined;
}

/** Validate options independently of whether a policy requests changes. @internal */
export function validateChangeOptions(options: RepositoryChangeOptions): void {
	if (
		options.mode !== undefined &&
		!["pr", "local", "staged"].includes(options.mode)
	) {
		throw new TypeError("Change mode must be pr, local, or staged.");
	}
	if (options.base !== undefined && (options.mode ?? "pr") !== "pr") {
		throw new TypeError("A change base is only valid in pr mode.");
	}
	for (const value of [options.base, options.defaultBranch]) {
		if (
			value !== undefined &&
			(typeof value !== "string" || value.trim() === "")
		) {
			throw new TypeError("Change branch references must be nonempty strings.");
		}
	}
}

function paths(output: string): string[] {
	return output.split("\0").filter((path) => path !== "");
}

function parseChanges(output: string): RepositoryChange[] {
	const tokens = paths(output);
	const entries: RepositoryChange[] = [];
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
			entries.push({ status: "renamed", oldPath: path, path: destination });
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

/** Copy and freeze a caller's snapshot before policies can observe it. @internal */
export function snapshotChanges(
	changes: RepositoryChangeSet,
): RepositoryChangeSet {
	return Object.freeze({
		...changes,
		entries: Object.freeze(
			changes.entries.map((entry) => Object.freeze({ ...entry })),
		),
	});
}

/** Collect changes once; does not fetch or require an actual pull request. @public */
export async function collectRepositoryChanges(
	root: string,
	options: RepositoryChangeOptions = {},
): Promise<RepositoryChangeSet> {
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
		return collectPrChanges(git, head, options);
	}
	const entries = await collectWorkingChanges(git, mode, head);
	return snapshotChanges({ mode, head, entries });
}

async function resolveTarget(
	git: Git,
	options: RepositoryChangeOptions,
): Promise<string> {
	const remotes = await git.getRemotes();
	const remote = remotes.some(
		(entry: { name: string }) => entry.name === "origin",
	)
		? "origin"
		: remotes.length === 1
			? remotes[0]?.name
			: undefined;
	let target =
		options.base ??
		(env.GITHUB_BASE_REF ||
			env.CI_MERGE_REQUEST_TARGET_BRANCH_NAME ||
			options.defaultBranch);
	if (!target && remote) {
		const remoteHead = await git.raw([
			"for-each-ref",
			"--format=%(symref)",
			`refs/remotes/${remote}/HEAD`,
		]);
		target = remoteHead.trim() || undefined;
	}
	if (!target) {
		throw new Error(
			"Cannot determine PR target. Set changes.defaultBranch or --change-base, or configure the default remote HEAD.",
		);
	}
	// Enumerate refs rather than masking errors from failed Git subprocesses.
	const refs = (await git.raw(["for-each-ref", "--format=%(refname)"]))
		.trim()
		.split("\n");
	if (target.startsWith("refs/")) {
		return target;
	}
	const candidates = [
		`refs/heads/${target}`,
		...(remote ? [`refs/remotes/${remote}/${target}`] : []),
	];
	return candidates.find((candidate) => refs.includes(candidate)) ?? target;
}

async function collectPrChanges(
	git: Git,
	head: string,
	options: RepositoryChangeOptions,
): Promise<RepositoryChangeSet> {
	const target = await resolveTarget(git, options);
	let base: string;
	let mergeBase: string;
	try {
		base = (
			await git.revparse(["--verify", "--end-of-options", `${target}^{commit}`])
		).trim();
		mergeBase = (await git.raw(["merge-base", base, head])).trim();
		if (!mergeBase) {
			throw new Error("No common ancestor is available.");
		}
	} catch (cause) {
		throw new Error(
			`Cannot resolve PR base '${target}' and its merge base with HEAD. Set --change-base or fetch the missing branch/history.`,
			{ cause },
		);
	}
	const entries = parseChanges(
		await git.raw([
			"diff",
			"--name-status",
			"-z",
			"--find-renames",
			"--no-ext-diff",
			mergeBase,
			head,
			"--",
		]),
	);
	return snapshotChanges({ mode: "pr", head, base, mergeBase, entries });
}

async function collectWorkingChanges(
	git: Git,
	mode: "local" | "staged",
	head: string | undefined,
): Promise<RepositoryChange[]> {
	let entries: RepositoryChange[];
	if (mode === "staged") {
		entries = parseChanges(
			await git.raw([
				"diff",
				"--cached",
				"--name-status",
				"-z",
				"--find-renames",
				"--no-ext-diff",
				...(head ? [head] : []),
				"--",
			]),
		);
	} else if (head) {
		entries = parseChanges(
			await git.raw([
				"diff",
				"--name-status",
				"-z",
				"--find-renames",
				"--no-ext-diff",
				head,
				"--",
			]),
		);
	} else {
		const deleted = new Set(
			paths(await git.raw(["ls-files", "--deleted", "-z"])),
		);
		entries = paths(await git.raw(["ls-files", "--cached", "-z"]))
			.filter((path) => !deleted.has(path))
			.map((path) => ({ status: "added", path }));
	}
	if (mode === "local") {
		for (const path of paths(
			await git.raw(["ls-files", "--others", "--exclude-standard", "-z"]),
		)) {
			entries.push({ status: "added", path });
		}
	}
	return entries;
}

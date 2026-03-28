import { resolve } from "pathe";
import type { SimpleGit } from "simple-git";
import type { BaseCommand } from "../baseCommand.js";
import { Repository } from "../git.js";
import { type LazyCapability, createLazy } from "./capability.js";

/**
 * Configuration options for git capability.
 *
 * @beta
 */
export interface GitCapabilityOptions {
	/**
	 * Base directory for the git repository.
	 * Can be an absolute or relative path. If relative, it will be resolved from the current working directory.
	 * The path does not need to be the repository root - git will search up the directory tree.
	 * @defaultValue process.cwd()
	 */
	baseDir?: string;

	/**
	 * Whether a git repository is required.
	 * If true and not in a repo, command will exit.
	 * @defaultValue true
	 */
	required?: boolean;
}

/**
 * Context returned when inside a git repository.
 * Provides access to git client, repository utilities, and helper methods.
 *
 * @example
 * ```typescript
 * const ctx = await gitCapability.get();
 * if (ctx.isRepo) {
 *   const branch = await ctx.getCurrentBranch();
 * }
 * ```
 *
 * @beta
 */
export interface GitContextInRepo {
	/**
	 * Whether we're in a git repository.
	 */
	isRepo: true;

	/**
	 * simple-git client instance.
	 */
	git: SimpleGit;

	/**
	 * Repository wrapper with additional utilities.
	 */
	repo: Repository;

	/**
	 * Get the current branch name.
	 */
	getCurrentBranch(): Promise<string>;

	/**
	 * Check if the working tree is clean (no uncommitted changes).
	 */
	isCleanWorkingTree(): Promise<boolean>;

	/**
	 * Check if there are uncommitted changes.
	 */
	hasUncommittedChanges(): Promise<boolean>;
}

/**
 * Context returned when not inside a git repository and `required` is `false`.
 *
 * @beta
 */
export interface GitContextNoRepo {
	/**
	 * Whether we're in a git repository.
	 */
	isRepo: false;

	/**
	 * The base directory that was searched for a git repository.
	 */
	baseDir: string;
}

/**
 * Context returned by the git capability.
 * Use the `isRepo` discriminator to determine if git helper methods are available.
 *
 * @example
 * ```typescript
 * const ctx = await gitCapability.get();
 * if (ctx.isRepo) {
 *   // TypeScript knows helper methods are available
 *   const branch = await ctx.getCurrentBranch();
 * } else {
 *   // TypeScript knows helper methods are not available
 *   console.log("Not in a git repository");
 * }
 * ```
 *
 * @beta
 */
export type GitContext = GitContextInRepo | GitContextNoRepo;

/**
 * Initialize git capability logic shared by useGit overloads.
 */
async function initializeGit<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
>(command: TCommand, options: GitCapabilityOptions): Promise<GitContext> {
	const baseDir = resolve(options.baseDir ?? process.cwd());
	const repo = new Repository({ baseDir });
	const git = repo.gitClient;

	// Check if we're in a git repository
	const isRepo = await git.checkIsRepo().catch(() => false);

	if (!isRepo && options.required !== false) {
		command.error(`Not a git repository: ${baseDir}`, { exit: 1 });
	}

	if (!isRepo) {
		return {
			isRepo: false,
			baseDir,
		} satisfies GitContextNoRepo;
	}

	return {
		git,
		repo,
		isRepo: true,

		getCurrentBranch: async () => {
			const branch = await git.branchLocal();
			return branch.current;
		},

		isCleanWorkingTree: async () => {
			const status = await git.status();
			return status.isClean();
		},

		hasUncommittedChanges: async () => {
			const status = await git.status();
			return !status.isClean();
		},
	} satisfies GitContextInRepo;
}

/**
 * Create a git capability for a command.
 *
 * When `required` is `true` (or omitted), the returned capability is narrowed to
 * `GitContextInRepo` since the command will exit if not in a git repository.
 *
 * @example
 * ```typescript
 * class MyCommand extends BaseCommand {
 *   // required: true (default) — no need to check isRepo
 *   private git = useGit(this);
 *
 *   async run() {
 *     const { git, getCurrentBranch } = await this.git.get();
 *     const branch = await getCurrentBranch();
 *   }
 * }
 * ```
 *
 * @beta
 */
export function useGit<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
>(
	command: TCommand,
	options: GitCapabilityOptions & { required: true },
): LazyCapability<GitContextInRepo>;
/**
 * Create a git capability for a command.
 *
 * When `required` is `false`, the returned capability uses the full
 * `GitContext` union — check `isRepo` to determine if git is available.
 *
 * @beta
 */
export function useGit<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
>(
	command: TCommand,
	options: GitCapabilityOptions & { required: false },
): LazyCapability<GitContext>;
/**
 * Create a git capability for a command.
 *
 * When `required` is omitted, defaults to `true` — the returned capability is narrowed to
 * `GitContextInRepo`.
 *
 * @beta
 */
export function useGit<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
>(
	command: TCommand,
	options?: GitCapabilityOptions,
): LazyCapability<GitContextInRepo>;
export function useGit<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
>(
	command: TCommand,
	options?: GitCapabilityOptions,
): LazyCapability<GitContext> {
	return createLazy(
		() => initializeGit(command, options ?? {}),
		command,
	);
}

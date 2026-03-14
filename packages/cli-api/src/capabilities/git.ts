import { resolve } from "pathe";
import type { SimpleGit } from "simple-git";
import type { BaseCommand } from "../baseCommand.js";
import { Repository } from "../git.js";
import { type Capability, CapabilityWrapper } from "./capability.js";

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
 * Git capability implementation.
 *
 * @beta
 */
export class GitCapability<
	// biome-ignore lint/suspicious/noExplicitAny: Generic base type needs 'any' to satisfy BaseCommand<T extends typeof Command> constraint
	TCommand extends BaseCommand<any>,
> implements Capability<TCommand, GitContext>
{
	public constructor(private options: GitCapabilityOptions = {}) {}

	public async initialize(command: TCommand): Promise<GitContext> {
		const baseDir = resolve(this.options.baseDir ?? process.cwd());
		const repo = new Repository({ baseDir });
		const git = repo.gitClient;

		// Check if we're in a git repository
		const isRepo = await git.checkIsRepo().catch(() => false);

		if (!isRepo && this.options.required !== false) {
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
}

/**
 * Helper function to create a git capability for a command.
 *
 * @example
 * ```typescript
 * class MyCommand extends BaseCommand {
 *   private git = useGit(this, { required: true });
 *
 *   async run() {
 *     const { git, getCurrentBranch } = await this.git.get();
 *     const branch = await getCurrentBranch();
 *     console.log(`On branch: ${branch}`);
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
	options?: GitCapabilityOptions,
): CapabilityWrapper<TCommand, GitContext> {
	return new CapabilityWrapper(command, new GitCapability<TCommand>(options));
}

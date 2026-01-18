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
 * Context returned by the git capability.
 * Provides access to git client, repository utilities, and helper methods.
 *
 * @remarks
 * The helper methods (`getCurrentBranch`, `isCleanWorkingTree`, `hasUncommittedChanges`)
 * require `isRepo` to be `true`. When `required: false` is used and not in a git repo,
 * calling these methods will throw an error. Always check `isRepo` first when using
 * optional git capability.
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
export interface GitContext {
	/**
	 * simple-git client instance.
	 */
	git: SimpleGit;

	/**
	 * Repository wrapper with additional utilities.
	 */
	repo: Repository;

	/**
	 * Whether we're in a git repository.
	 * When `false`, helper methods will throw an error if called.
	 */
	isRepo: boolean;

	/**
	 * Get the current branch name.
	 * @throws Error if `isRepo` is `false`.
	 */
	getCurrentBranch(): Promise<string>;

	/**
	 * Check if the working tree is clean (no uncommitted changes).
	 * @throws Error if `isRepo` is `false`.
	 */
	isCleanWorkingTree(): Promise<boolean>;

	/**
	 * Check if there are uncommitted changes.
	 * @throws Error if `isRepo` is `false`.
	 */
	hasUncommittedChanges(): Promise<boolean>;
}

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
		const baseDir = this.options.baseDir ?? process.cwd();
		const repo = new Repository({ baseDir });
		const git = repo.gitClient;

		// Check if we're in a git repository
		const isRepo = await git.checkIsRepo().catch(() => false);

		if (!isRepo && this.options.required !== false) {
			command.error(`Not a git repository: ${baseDir}`, { exit: 1 });
		}

		return {
			git,
			repo,
			isRepo,

			// Attach helper methods with runtime guards
			getCurrentBranch: async () => {
				if (!isRepo) {
					throw new Error(
						"Cannot get current branch: not in a git repository",
					);
				}
				const branch = await git.branchLocal();
				return branch.current;
			},

			isCleanWorkingTree: async () => {
				if (!isRepo) {
					throw new Error(
						"Cannot check working tree: not in a git repository",
					);
				}
				const status = await git.status();
				return status.isClean();
			},

			hasUncommittedChanges: async () => {
				if (!isRepo) {
					throw new Error(
						"Cannot check uncommitted changes: not in a git repository",
					);
				}
				const status = await git.status();
				return !status.isClean();
			},
		};
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

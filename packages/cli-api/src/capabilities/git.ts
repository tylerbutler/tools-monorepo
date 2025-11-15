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
	 */
	isRepo: boolean;

	// Helper methods
	getCurrentBranch(): Promise<string>;
	isCleanWorkingTree(): Promise<boolean>;
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

			// Attach helper methods
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

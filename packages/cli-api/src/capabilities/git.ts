import type { SimpleGit } from "simple-git";
import type { BaseCommand } from "../baseCommand.js";
import { Repository } from "../git.js";
import { Capability, CapabilityHolder } from "./capability.js";

/**
 * Configuration options for git capability.
 */
export interface GitCapabilityOptions {
	/**
	 * Base directory for the git repository.
	 * @default process.cwd()
	 */
	baseDir?: string;

	/**
	 * Whether a git repository is required.
	 * If true and not in a repo, command will exit.
	 * @default true
	 */
	required?: boolean;
}

/**
 * Result returned by the git capability.
 */
export interface GitResult {
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
 */
export class GitCapability<TCommand extends BaseCommand<any>>
	implements Capability<TCommand, GitResult>
{
	constructor(private options: GitCapabilityOptions = {}) {}

	async initialize(command: TCommand): Promise<GitResult> {
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
 */
export function useGit<TCommand extends BaseCommand<any>>(
	command: TCommand,
	options?: GitCapabilityOptions,
): CapabilityHolder<TCommand, GitResult> {
	return new CapabilityHolder(command, new GitCapability<TCommand>(options));
}

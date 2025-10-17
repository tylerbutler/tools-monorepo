import process from "node:process";
import type { Command, Config } from "@oclif/core";
import type { SimpleGit } from "simple-git";
import { CommandWithConfig } from "./configCommand.js";
import { Repository } from "./git.js";

/**
 * A base class for commands that are expected to run in a git repository.
 *
 * @beta
 */
export abstract class GitCommand<
	T extends typeof Command & {
		args: typeof GitCommand.args;
		flags: typeof GitCommand.flags;
	},
	C = undefined,
> extends CommandWithConfig<T, C> {
	protected git: SimpleGit;
	protected repo: Repository;

	/**
	 * GitCommand doesn't require config by default. Subclasses that need config should set this to `true`.
	 */
	protected override requiresConfig = false;

	public constructor(argv: string[], config: Config) {
		super(argv, config);

		this.repo = new Repository({ baseDir: process.cwd() });
		this.git = this.repo.gitClient;
	}
}

/**
 * An interface implemented by commands that expect to be used in a Git repository.
 *
 * @beta
 */
export interface CommandWithGit {
	git: SimpleGit;

	/**
	 * The absolute path to the root of the git repository.
	 */
	// gitRepoPath: string;
}

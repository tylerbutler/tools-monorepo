import {
	CommandWithConfig,
	type CommandWithContext,
	type RequiresGit,
} from "@tylerbu/cli-api";
import { findGitRootSync } from "@tylerbu/fundamentals/git";
import { type SimpleGit, simpleGit } from "simple-git";
import { DefaultPolicyConfig, type RepopoConfig } from "./config.js";
import type { ExcludedPolicyFileMap, RepopoCommandContext } from "./context.js";
import { newPerfStats } from "./perf.js";
import { DefaultPolicies } from "./policy.js";
import { ProgressBarManager } from "./progressBars.js";

/**
 * This class is the base for all repopo commands. It contains common flags and config loading.
 */
export abstract class BaseRepopoCommand<
		T extends typeof BaseRepopoCommand & {
			args: typeof CommandWithConfig.args;
			flags: typeof CommandWithConfig.flags;
		},
	>
	extends CommandWithConfig<T, RepopoConfig>
	implements CommandWithContext<RepopoCommandContext>, RequiresGit
{
	protected override defaultConfig = DefaultPolicyConfig;

	static override readonly flags = {
		...CommandWithConfig.flags,
	} as const;

	private _git: SimpleGit | undefined;
	public get git(): SimpleGit {
		if (this._git === undefined) {
			throw new Error("git property is undefined");
		}
		return this._git;
	}

	public override async init(): Promise<void> {
		await super.init();

		const excludeFiles: RegExp[] =
			this.commandConfig?.excludeFiles?.map((e) => new RegExp(e, "i")) ?? [];

		const excludePoliciesForFilesRaw =
			this.commandConfig?.excludePoliciesForFiles;

		const excludePoliciesForFiles: ExcludedPolicyFileMap = new Map();
		if (excludePoliciesForFilesRaw) {
			for (const [policyName, filters] of Object.entries(
				excludePoliciesForFilesRaw,
			)) {
				const regexes = filters.map((e) => new RegExp(e, "i"));
				excludePoliciesForFiles.set(policyName, regexes);
			}
		}

		const gitRoot = findGitRootSync();
		this._git = simpleGit({ baseDir: gitRoot });
		this._context = {
			excludeFromAll: excludeFiles,
			policies: this.commandConfig?.policies ?? DefaultPolicies,
			excludePoliciesForFiles,
			gitRoot,
			perfStats: newPerfStats(),
			bars: new ProgressBarManager(`${this.config.bin} ${this.config.name}`),
		};
	}

	private _context: RepopoCommandContext | undefined;

	// biome-ignore lint/suspicious/useAwait: interface defines this as async
	public async getContext(): Promise<RepopoCommandContext> {
		if (this._context === undefined) {
			throw new Error("Context not initialized.");
		}
		return this._context;
	}
}

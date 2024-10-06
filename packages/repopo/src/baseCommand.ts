import { Flags } from "@oclif/core";
import { GitCommand, RegExpFlag, findGitRoot } from "@tylerbu/cli-api";

import type { PolicyConfig } from "./config.js";
import { type PolicyHandlerPerfStats, newPerfStats } from "./perf.js";
import { DefaultPolicies, type PolicyName, type RepoPolicy } from "./policy.js";

/**
 * A convenience interface used to pass commonly used parameters between functions.
 */
export interface PolicyCommandContext {
	/**
	 * A regular expression used to filter selected files.
	 */
	pathRegex: RegExp;

	/**
	 * A list of regular expressions used to exclude files from all handlers.
	 */
	excludeFiles: RegExp[];

	/**
	 * A list of handlers to apply to selected files.
	 */
	policies: RepoPolicy[];

	/**
	 * A per-handler list of regular expressions used to exclude files from specific handlers.
	 */
	excludePoliciesForFiles: ExcludedPolicyFileMap;

	/**
	 * Path to the root of the git repo.
	 */
	gitRoot: string;

	/**
	 * Performance information for each handler.
	 */
	perfStats: PolicyHandlerPerfStats;
}

/**
 * This command lists all the policies configured to run.
 */
export abstract class BaseRepopoCommand<
	T extends typeof BaseRepopoCommand & {
		args: typeof GitCommand.args;
		flags: typeof GitCommand.flags;
	},
> extends GitCommand<T, PolicyConfig> {
	static override readonly flags = {
		policy: RegExpFlag({
			description:
				"Filter policies to apply by <regex>. Only policies with a name matching the regex will be applied.",
			required: false,
			char: "d",
		}),
		excludePolicy: Flags.string({
			char: "D",
			description:
				"Exclude policies by name. Can be specified multiple times to exclude multiple policies.",
			exclusive: ["policy"],
			multiple: true,
		}),
		path: RegExpFlag({
			description: "Filter file paths by <regex>.",
			required: false,
			char: "p",
		}),
		...GitCommand.flags,
	} as const;

	private context: PolicyCommandContext | undefined;

	protected getContext(): PolicyCommandContext {
		if (this.context === undefined) {
			throw new Error("context undefined");
		}
		return this.context;
	}

	public override async init(): Promise<void> {
		await super.init();
		const { flags } = this;
		const config = await this.loadConfig();
		let policies = config?.policies ?? DefaultPolicies;
		policies =
			policies.filter((h) => {
				if (
					flags.excludePolicy === undefined ||
					flags.excludePolicy.length === 0
				) {
					return true;
				}
				const shouldRun = flags.excludePolicy?.includes(h.name) === false;
				if (!shouldRun) {
					this.info(`Disabled policy: ${h.name}`);
				}
				return shouldRun;
			}) ?? [];
		if (flags.policy !== undefined) {
			this.info(`Filtering handlers by regex: ${flags.policy}`);
			policies = policies.filter((h) => flags.policy?.test(h.name));
		}

		const excludeFiles: RegExp[] =
			config?.excludeFiles?.map((e) => toRegExp(e)) ?? [];
		const excludePoliciesForFilesRaw = config?.excludePoliciesForFiles;
		const excludePoliciesForFiles: ExcludedPolicyFileMap = new Map();
		if (excludePoliciesForFilesRaw) {
			for (const [policyName, filters] of Object.entries(
				excludePoliciesForFilesRaw,
			)) {
				const regexes = filters.map((e) => toRegExp(e));
				excludePoliciesForFiles.set(policyName, regexes);
			}
		}
		const gitRoot = await findGitRoot();

		const pathRegex = this.flags.path ?? /.?/;
		if (this.flags.path !== undefined) {
			this.info(`Filtering file paths by regex: ${pathRegex}`);
		}

		this.context = {
			pathRegex,
			excludeFiles,
			policies,
			excludePoliciesForFiles,
			gitRoot,
			perfStats: newPerfStats(),
		};
	}
}

export type ExcludedPolicyFileMap = Map<PolicyName, RegExp[]>;

function toRegExp(input: string | RegExp): RegExp {
	if (typeof input === "string") {
		return new RegExp(input, "i");
	}
	return input;
}

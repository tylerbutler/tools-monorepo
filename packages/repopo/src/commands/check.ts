import { EOL as newline } from "node:os";
import timers from "node:timers/promises";
import { Flags } from "@oclif/core";
import { StringBuilder } from "@rushstack/node-core-library";
import chalk from "picocolors";

import { BaseRepopoCommand } from "../baseCommand.js";
import type { RepopoCommandContext } from "../context.js";
import { type PolicyHandlerPerfStats, logStats, runWithPerf } from "../perf.js";
import {
	type PolicyFailure,
	type PolicyFixResult,
	type PolicyHandlerResult,
	type PolicyStandaloneResolver,
	type RepoPolicy,
	isPolicyFixResult,
} from "../policy.js";

/**
 * This tool enforces policies across the code base via a series of handler functions. The handler functions are
 * associated with a regular expression, and all files matching that expression are passed to the handler function.
 *
 * By default, the list of files to check comes from `git ls-files. You can also pipe in file names from stdin. For
 * example:
 *
 * `git ls-files -co --exclude-standard --full-name | repopo check --stdin --verbose`
 */
export class CheckPolicy<
	T extends typeof BaseRepopoCommand & {
		args: typeof CheckPolicy.args;
		flags: typeof CheckPolicy.flags;
	},
> extends BaseRepopoCommand<T> {
	static override readonly summary =
		"Checks and applies policies to the files in the repository.";

	static override readonly flags = {
		fix: Flags.boolean({
			aliases: ["resolve"],
			description: "Fix errors if possible.",
			required: false,
			char: "f",
		}),
		stdin: Flags.boolean({
			description: "Read list of files from stdin.",
			required: false,
		}),
		...BaseRepopoCommand.flags,
	} as const;

	public override async run(): Promise<void> {
		if (this.flags.fix) {
			this.info("Resolving errors if possible.");
		}

		const config = this.commandConfig;
		const policies = config?.policies ?? [];
		this.verbose(`${policies.length} policies loaded.`);
		for (const h of policies) {
			this.verbose(h.name);
		}

		const filePathsToCheck: string[] = [];

		if (this.flags.stdin) {
			const stdInput = await readStdin();

			if (stdInput !== undefined) {
				filePathsToCheck.push(
					...stdInput
						.replace(
							// normalize slashes in case they're windows paths
							/\\/g,
							"/",
						)
						.split("\n"),
				);
			}
		} else {
			const gitFiles =
				(await this.git.raw(
					"ls-files",
					// include staged files and untracked files
					"-co",
					// exclude gitignored files and other standard ignore rules
					"--exclude-standard",
					// Outputs paths relative to the root of the repository, regardless of the current working directory.
					"--full-name",
				)) ?? "";

			filePathsToCheck.push(
				...gitFiles
					.replace(
						// normalize slashes in case they're windows paths
						/\\/g,
						"/",
					)
					.split("\n"),
			);
		}

		const context: RepopoCommandContext = await this.getContext();

		for (const policy of policies) {
			context.bars.addTask(policy.name, {
				type: "percentage",
				message: "Checking",
			});
		}

		await this.checkAllFiles(filePathsToCheck, context);

		for (const policy of policies) {
			context.bars.done(policy.name, {
				message: `${context.perfStats.data.get("handle")?.get(policy.name) ?? 0}ms`,
			});
		}
	}

	/**
	 * Executes all policies against the provided paths.
	 *
	 * @param pathsToCheck - All paths that should be checked. Paths should be relative to the repository root.
	 * @param context - The context.
	 */
	private async checkAllFiles(
		pathsToCheck: string[],
		context: RepopoCommandContext,
	): Promise<void> {
		try {
			for (const pathToCheck of pathsToCheck) {
				await this.checkOrExcludeFile(pathToCheck, context);
			}
		} finally {
			if (this.flags.verbose) {
				logStats(context.perfStats, this);
			}
		}
	}

	/**
	 * Given a string that represents a path to a file in the repo, determines if the file should be checked, and if so,
	 * routes the file to the appropriate handlers.
	 *
	 * @param inputPath - A git repo-relative path to a file.
	 */
	private async checkOrExcludeFile(
		relPath: string,
		commandContext: RepopoCommandContext,
	): Promise<void> {
		const { perfStats } = commandContext;
		perfStats.count++;

		try {
			await this.routeToPolicies(relPath, commandContext);
		} catch (error: unknown) {
			throw new Error(
				`Error routing ${relPath} to handler: ${error}\nStack:\n${(error as Error).stack}`,
			);
		}

		perfStats.processed++;
	}

	private async routeToPolicies(
		relPath: string,
		context: RepopoCommandContext,
	): Promise<void> {
		const { policies, excludeFromAll, bars } = context;

		// Check exclusions
		if (excludeFromAll.some((regex) => regex.test(relPath))) {
			this.verbose(`Excluded all handlers: ${relPath}`);
			return; // Early return for excluded files
		}

		// Run all matching policies
		const matchingPolicies = policies.filter((policy) =>
			policy.match.test(relPath),
		);

		// for(const policy of matchingPolicies) {
		// 	bars.addFile(policy.name,
		// }

		await Promise.all(
			matchingPolicies.map(async (policy) => {
				bars.addFile(policy.name, relPath);
				return await this.runPolicyOnFile(relPath, policy, context);
			}),
		);
	}

	private async runPolicyOnFile(
		relPath: string,
		policy: RepoPolicy,
		context: RepopoCommandContext,
	): Promise<void> {
		const { excludePoliciesForFiles, perfStats, gitRoot } = context;

		// Check if the policy is excluded for the file
		if (this.isPolicyExcluded(relPath, policy, excludePoliciesForFiles)) {
			this.verbose(`Excluded from '${policy.name}' policy: ${relPath}`);
			return;
		}

		try {
			// Execute the policy handler
			const result = await this.executePolicyHandler(
				relPath,
				policy,
				perfStats,
				gitRoot,
			);

			// Handle the result of the policy execution
			context.bars.setFileResult(policy.name, relPath, result);
			await this.handlePolicyResult(
				result,
				relPath,
				policy,
				perfStats,
				gitRoot,
			);
		} catch (error: unknown) {
			// Log and rethrow the error for higher-level handling
			this.error(
				`Error executing policy '${policy.name}' for file '${relPath}': ${error}`,
			);
		}
	}

	private isPolicyExcluded(
		relPath: string,
		policy: RepoPolicy,
		excludePoliciesForFiles: Map<string, RegExp[]>,
	): boolean {
		return (
			excludePoliciesForFiles
				.get(policy.name)
				?.some((regex) => regex.test(relPath)) ?? false
		);
	}

	private async executePolicyHandler(
		relPath: string,
		policy: RepoPolicy,
		perfStats: PolicyHandlerPerfStats,
		gitRoot: string,
	): Promise<PolicyHandlerResult> {
		try {
			return await runWithPerf(policy.name, "handle", perfStats, () =>
				policy.handler({
					file: relPath,
					root: gitRoot,
					resolve: this.flags.fix,
					config: this.commandConfig?.perPolicyConfig?.[policy.name],
				}),
			);
		} catch (error: unknown) {
			this.error(
				`Error in policy handler '${policy.name}' for file '${relPath}': ${error}`,
			);
		}
	}

	private async handlePolicyResult(
		result: PolicyHandlerResult,
		relPath: string,
		policy: RepoPolicy,
		perfStats: PolicyHandlerPerfStats,
		gitRoot: string,
	): Promise<void> {
		if (result === true) {
			return;
		}

		if (isPolicyFixResult(result)) {
			this.handleFixResult(result, policy);
		} else {
			await this.handleFailureResult(
				result,
				relPath,
				policy,
				perfStats,
				gitRoot,
			);
		}
	}

	private handleFixResult(result: PolicyFixResult, policy: RepoPolicy): void {
		const messages = new StringBuilder();

		if (result.resolved) {
			messages.append(
				`Resolved ${policy.name} policy failure for file: ${result.file}`,
			);
		} else {
			messages.append(
				`Error fixing ${policy.name} policy failure in ${result.file}`,
			);
			process.exitCode = 1;
		}

		this.logMessages(messages);
	}

	private async handleFailureResult(
		result: PolicyFailure,
		relPath: string,
		policy: RepoPolicy,
		perfStats: PolicyHandlerPerfStats,
		gitRoot: string,
	): Promise<void> {
		const messages = new StringBuilder();

		if (this.flags.fix && policy.resolver) {
			await this.attemptResolution(
				relPath,
				policy,
				policy.resolver,
				perfStats,
				gitRoot,
				messages,
			);
		} else {
			this.logPolicyFailure(result, policy, messages);
		}

		this.logMessages(messages);
	}

	private async attemptResolution(
		relPath: string,
		policy: RepoPolicy,
		resolver: PolicyStandaloneResolver,
		perfStats: PolicyHandlerPerfStats,
		gitRoot: string,
		messages: StringBuilder,
	): Promise<void> {
		messages.append(`${newline}Attempting to resolve: ${relPath}`);
		const resolveResult = await runWithPerf(
			policy.name,
			"resolve",
			perfStats,
			() => resolver({ file: relPath, root: gitRoot }),
		);

		if (!resolveResult.resolved) {
			process.exitCode = 1;
		}

		if (resolveResult.errorMessage) {
			messages.append(newline + resolveResult.errorMessage);
		}
	}

	private logPolicyFailure(
		result: PolicyFailure,
		policy: RepoPolicy,
		messages: StringBuilder,
	): void {
		const autoFixable = result.autoFixable ? chalk.green(" (autofixable)") : "";
		messages.append(
			`'${chalk.bold(policy.name)}' policy failure${autoFixable}: ${result.file}`,
		);
		if (result.errorMessage) {
			messages.append(`${newline}\t${result.errorMessage}`);
		}
		process.exitCode = 1;
	}
	private logMessages(messages: StringBuilder): void {
		if ((process.exitCode ?? 0) === 0) {
			this.info(messages.toString());
		} else {
			this.warning(messages.toString());
		}
	}
}

async function readStdin(): Promise<string> {
	return new Promise((resolve) => {
		const stdin = process.stdin;
		stdin.setEncoding("utf8");

		let data = "";
		stdin.on("data", (chunk) => {
			data += chunk;
		});

		stdin.on("end", () => {
			resolve(data);
		});

		if (stdin.isTTY) {
			resolve("");
		}
	});
}

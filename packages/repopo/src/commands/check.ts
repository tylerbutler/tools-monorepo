import { EOL as newline } from "node:os";
import { Flags } from "@oclif/core";
import { StringBuilder } from "@rushstack/node-core-library";
import path from "pathe";
import chalk from "picocolors";

import { BaseRepopoCommand } from "../baseCommand.js";
import type { RepopoCommandContext } from "../context.js";
import { type PolicyHandlerPerfStats, logStats, runWithPerf } from "../perf.js";
import { type RepoPolicy, isPolicyFixResult } from "../policy.js";

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
				filePathsToCheck.push(...stdInput.split("\n"));
			}
		} else {
			const gitFiles =
				(await this.git.raw(
					"ls-files",
					"-co",
					"--exclude-standard",
					"--full-name",
				)) ?? "";

			filePathsToCheck.push(...gitFiles.split("\n"));
		}

		await this.executeAllPolicies(filePathsToCheck);
	}

	private async executeAllPolicies(pathsToCheck: string[]): Promise<void> {
		const commandContext: RepopoCommandContext = await this.getContext();

		try {
			for (const pathToCheck of pathsToCheck) {
				// eslint-disable-next-line no-await-in-loop
				await this.checkOrExcludeFile(pathToCheck, commandContext);
			}
		} finally {
			if (!this.flags.quiet) {
				logStats(commandContext.perfStats, this);
			}
		}
	}

	/**
	 * Routes files to their handlers and resolvers by regex testing their full paths. If a file fails a policy that has a
	 * resolver, the resolver will be invoked as well. Synchronizes the output, exit codes, and resolve
	 * decision for all handlers.
	 */
	private async routeToHandlers(
		file: string,
		commandContext: RepopoCommandContext,
	): Promise<void> {
		const { policies, gitRoot } = commandContext;

		// Use the repo-relative path so that regexes that specify string start (^) will match repo paths.
		// Replace \ in result with / in case OS is Windows.
		const relPath = path.relative(gitRoot, file).replace(/\\/g, "/");

		const filteredPolicies = policies.filter((handler) =>
			handler.match.test(relPath),
		);

		const resultsP: Promise<void>[] = [];

		for (const policy of filteredPolicies) {
			resultsP.push(this.runPolicyOnFile(relPath, policy));
		}

		await Promise.all(resultsP);
	}

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: FIXME
	private async runPolicyOnFile(
		relPath: string,
		policy: RepoPolicy,
	): Promise<void> {
		const context = await this.getContext();
		const { excludePoliciesForFiles, perfStats, gitRoot } = context;

		if (
			excludePoliciesForFiles
				.get(policy.name)
				?.some((regex) => regex.test(relPath))
		) {
			this.verbose(`Excluded from '${policy.name}' policy: ${relPath}`);
			return;
		}

		const result = await runWithPerf(policy.name, "handle", perfStats, () =>
			policy.handler({
				file: relPath,
				root: gitRoot,
				resolve: this.flags.fix,
				config: this.commandConfig?.perPolicyConfig?.[policy.name],
			}),
		);

		await this.handlePolicyResult(result, relPath, policy, perfStats, gitRoot);
	}
	/**
	 * Given a string that represents a path to a file in the repo, determines if the file should be checked, and if so,
	 * routes the file to the appropriate handlers.
	 */
	private async checkOrExcludeFile(
		inputPath: string,
		commandContext: RepopoCommandContext,
	): Promise<void> {
		const { excludeFiles: exclusions, gitRoot, perfStats } = commandContext;

		const filePath = path.join(gitRoot, inputPath).trim().replace(/\\/g, "/");

		perfStats.count++;
		if (!exclusions.every((value) => !value.test(inputPath))) {
			this.verbose(`Excluded all handlers: ${inputPath}`);
			return;
		}

		try {
			await this.routeToHandlers(filePath, commandContext);
		} catch (error: unknown) {
			throw new Error(
				`Error routing ${filePath} to handler: ${error}\nStack:\n${(error as Error).stack}`,
			);
		}

		perfStats.processed++;
	}

	private async handlePolicyResult(
		result: unknown,
		relPath: string,
		policy: RepoPolicy,
		perfStats: PolicyHandlerPerfStats,
		gitRoot: string,
	): Promise<void> {
		const messages = new StringBuilder();

		if (result === true) {
			return;
		}

		if (isPolicyFixResult(result)) {
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
		} else {
			const { resolver } = policy;
			if (this.flags.fix && resolver) {
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
			} else {
				const autoFixable = result.autoFixable
					? chalk.green(" (autofixable)")
					: "";
				messages.append(
					`'${chalk.bold(policy.name)}' policy failure${autoFixable}: ${result.file}`,
				);
				if (result.errorMessage)
					messages.append(`${newline}\t${result.errorMessage}`);
				process.exitCode = 1;
			}
		}

		this[(process.exitCode ?? 0) === 0 ? "info" : "warning"](
			messages.toString(),
		);
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

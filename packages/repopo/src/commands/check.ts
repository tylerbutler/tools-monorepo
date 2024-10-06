import fs from "node:fs";
import { EOL as newline } from "node:os";
import path from "node:path";
import { Flags } from "@oclif/core";
import { StringBuilder } from "@rushstack/node-core-library";
import chalk from "chalk";

import {
	BaseRepopoCommand,
	type PolicyCommandContext,
} from "../baseCommand.js";
import { DefaultPolicyConfig } from "../config.js";
import { logStats, runWithPerf } from "../perf.js";
import { isPolicyFixResult } from "../policy.js";

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

	private processed = 0;
	private count = 0;

	public get defaultConfig() {
		return DefaultPolicyConfig;
	}

	public override async init(): Promise<void> {
		await super.init();

		if (this.flags.fix) {
			this.info("Resolving errors if possible.");
		}
	}

	public override async run(): Promise<void> {
		// list the handlers then exit
		const config = await this.loadConfig();
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

		try {
			const context = this.getContext();
			await this.executePolicy(filePathsToCheck, context);
		} catch (error) {
			this.error(`Command context was undefined - fatal error: ${error}`, {
				exit: 100,
			});
		}
	}

	private async executePolicy(
		pathsToCheck: string[],
		commandContext: PolicyCommandContext,
	): Promise<void> {
		try {
			for (const pathToCheck of pathsToCheck) {
				// eslint-disable-next-line no-await-in-loop
				await this.checkOrExcludeFile(pathToCheck, commandContext);
			}
		} finally {
			logStats(commandContext.perfStats, this);
		}
	}

	/**
	 * Routes files to their handlers and resolvers by regex testing their full paths. If a file fails a policy that has a
	 * resolver, the resolver will be invoked as well. Synchronizes the output, exit codes, and resolve
	 * decision for all handlers.
	 */
	private async routeToHandlers(
		file: string,
		commandContext: PolicyCommandContext,
	): Promise<void> {
		const { policies, excludePoliciesForFiles, gitRoot, perfStats } =
			commandContext;

		// Use the repo-relative path so that regexes that specify string start (^) will match repo paths.
		// Replace \ in result with / in case OS is Windows.
		const relPath = path.relative(gitRoot, file).replace(/\\/g, "/");
		const config = await this.loadConfig();

		await Promise.all(
			policies
				.filter((handler) => handler.match.test(relPath))
				// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: <explanation>
				.map(async (policy): Promise<void> => {
					// doing exclusion per handler
					const exclusions = excludePoliciesForFiles.get(policy.name);
					if (
						exclusions !== undefined &&
						!exclusions.every((regex) => !regex.test(relPath))
					) {
						this.verbose(`Excluded from '${policy.name}' policy: ${relPath}`);
						return;
					}

					const result = await runWithPerf(
						policy.name,
						"handle",
						perfStats,
						async () =>
							policy.handler({
								file: relPath,
								root: gitRoot,
								resolve: this.flags.fix,
								config: config?.policySettings?.[policy.name],
							}),
					);

					if (result === true) {
						return;
					}

					const messages = new StringBuilder();
					if (isPolicyFixResult(result)) {
						if (result.resolved) {
							messages.append(
								`Resolved ${policy.name} policy failure for file: ${result.file}`,
							);
						} else {
							messages.append(
								`Error when trying to fix ${policy.name} policy failure in ${result.file}`,
							);
							process.exitCode = 1;
						}
					} else {
						// result must be a PolicyFailureResult; check if there is a standalone resolver.
						const { resolver } = policy;

						if (this.flags.fix && resolver !== undefined) {
							// Resolve the failure
							messages.append(`${newline}attempting to resolve: ${relPath}`);
							const resolveResult = await runWithPerf(
								policy.name,
								"resolve",
								perfStats,
								async () => resolver({ file: relPath, root: gitRoot }),
							);

							if (
								resolveResult.errorMessage !== undefined &&
								resolveResult.errorMessage !== ""
							) {
								messages.append(newline + resolveResult.errorMessage);
							}

							if (!resolveResult.resolved) {
								process.exitCode = 1;
							}
						} else {
							// No resolver, or fix is false, so we're in the full failure case.
							const autoFixable = result.autoFixable
								? chalk.green(" (autofixable)")
								: "";
							messages.append(
								`'${policy.name}' policy failure${autoFixable}: ${result.file}`,
							);
							messages.append(
								result.errorMessage === undefined
									? ""
									: `${newline}${result.errorMessage}`,
							);
							process.exitCode = 1;
						}
					}

					if ((process.exitCode ?? 0) === 0) {
						this.info(messages.toString());
					} else {
						this.warning(messages.toString());
					}
				}),
		);
	}

	/**
	 * Given a string that represents a path to a file in the repo, determines if the file should be checked, and if so,
	 * routes the file to the appropriate handlers.
	 */
	private async checkOrExcludeFile(
		inputPath: string,
		commandContext: PolicyCommandContext,
	): Promise<void> {
		const { excludeFiles: exclusions, gitRoot, pathRegex } = commandContext;

		const filePath = path.join(gitRoot, inputPath).trim().replace(/\\/g, "/");

		if (!(pathRegex.test(inputPath) && fs.existsSync(filePath))) {
			return;
		}

		this.count++;
		if (!exclusions.every((value) => !value.test(inputPath))) {
			this.verbose(`Excluded all handlers: ${inputPath}`);
			return;
		}

		try {
			await this.routeToHandlers(filePath, commandContext);
		} catch (error: unknown) {
			throw new Error(`Error routing ${filePath} to handler: ${error}`);
		}

		this.processed++;
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

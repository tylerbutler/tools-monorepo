import fs from "node:fs";
import { EOL as newline } from "node:os";
import path from "node:path";
import { Flags } from "@oclif/core";
import { StringBuilder } from "@rushstack/node-core-library";
import { GitCommand, RegExpFlag, findGitRoot } from "@tylerbu/cli-api";
import chalk from "chalk";
import { type CosmiconfigResult, cosmiconfig } from "cosmiconfig";
import { DefaultPolicyConfig, type PolicyConfig } from "../config.js";
import {
	DefaultPolicies,
	type PolicyName,
	type RepoPolicy,
	isPolicyFixResult,
} from "../policy.js";

type PolicyAction = "handle" | "resolve";

type ExcludedPolicyFileMap = Map<PolicyName, RegExp[]>; // Record<PolicyName, RegExp[]>

/**
 * A convenience interface used to pass commonly used parameters to functions in this file.
 */
interface CheckPolicyCommandContext {
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
	 * The repo context.
	 */
	// context: Context;
}

/**
 * Stores performance data for each handler. Used to collect and display performance stats.
 */
const handlerPerformanceData = new Map<PolicyAction, Map<string, number>>();

/**
 * This tool enforces policies across the code base via a series of handler functions. The handler functions are
 * associated with a regular expression, and all files matching that expression are passed to the handler function.
 *
 * By default, the list of files to check comes from `git ls-files. You can also pipe in file names from stdin. For
 * example:
 *
 * `git ls-files -co --exclude-standard --full-name | repopo check --stdin --verbose`
 */
export class CheckPolicy extends GitCommand<
	typeof CheckPolicy & {
		args: typeof GitCommand.args;
		flags: typeof GitCommand.flags;
	},
	PolicyConfig
> {
	static override readonly summary =
		"Checks and applies policies to the files in the repository.";

	static override readonly flags = {
		fix: Flags.boolean({
			aliases: ["resolve"],
			description: "Fix errors if possible.",
			required: false,
			char: "f",
		}),
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
		stdin: Flags.boolean({
			description: "Read list of files from stdin.",
			required: false,
		}),
		...GitCommand.flags,
	} as const;

	private processed = 0;
	private count = 0;
	// private policies: RepoPolicy[] | undefined;
	private commandContext: CheckPolicyCommandContext | undefined;

	public get defaultConfig() {
		return DefaultPolicyConfig;
	}

	// protected override async loadConfig(): Promise<PolicyConfig> {
	// 	const gitRoot = await findGitRoot();
	// 	// this.configPath ??= this.config.configDir; // path.join(this.config.configDir, "config.ts");
	// 	const explorer = cosmiconfig(this.config.bin, {
	// 		searchStrategy: "global",
	// 	});
	// 	this.verbose(`Looking for '${this.config.bin}' config at '${gitRoot}'`);
	// 	const config: CosmiconfigResult = await explorer.search(gitRoot);
	// 	if (config?.config !== undefined) {
	// 		this.verbose(`Found config at ${config.filepath}`);
	// 	}
	// 	if (config?.config === undefined) {
	// 		this.warning("No config found; using defaults.");
	// 	}
	// 	const finalConfig: PolicyConfig = config?.config ?? this.defaultConfig;
	// 	if (finalConfig.includeDefaultPolicies === true) {
	// 		finalConfig.policies ??= [];
	// 		finalConfig.policies.push(...DefaultPolicies);
	// 	}

	// 	return finalConfig;
	// }

	public override async init(): Promise<void> {
		await super.init();

		const config = await this.loadConfig();
		let policies =
			config?.policies?.filter((h) => {
				if (
					this.flags.excludePolicy === undefined ||
					this.flags.excludePolicy.length === 0
				) {
					return true;
				}
				const shouldRun = this.flags.excludePolicy?.includes(h.name) === false;
				if (!shouldRun) {
					this.info(`Disabled policy: ${h.name}`);
				}
				return shouldRun;
			}) ?? [];

		// const pathRegex: RegExp =
		// 	this.flags.path === undefined ? /.?/ : new RegExp(this.flags.path, "i");

		if (this.flags.policy !== undefined) {
			this.info(`Filtering handlers by regex: ${this.flags.policy}`);
			policies = policies?.filter((h) => this.flags.policy?.test(h.name));
		}

		const pathRegex = this.flags.path ?? /.?/;
		if (this.flags.path !== undefined) {
			this.info(`Filtering file paths by regex: ${pathRegex}`);
		}

		if (this.flags.fix) {
			this.info("Resolving errors if possible.");
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
		this.commandContext = {
			pathRegex,
			excludeFiles,
			policies,
			excludePoliciesForFiles,
			gitRoot,
		};
	}

	public override async run(): Promise<void> {
		// list the handlers then exit
		// if (this.flags.listHandlers) {
		// 	for (const h of handlersToRun) {
		// 		this.log(`${h.name}\nresolver: ${h.resolver !== undefined}\n`);
		// 	}
		// 	this.log(`${handlersToRun.length} TOTAL POLICY HANDLERS`);
		// 	this.exit(0);
		// }
		const config = await this.loadConfig();
		const policies = config?.policies ?? [];
		this.verbose(`${policies.length} policies loaded.`);
		for (const h of policies) {
			this.verbose(h.name);
		}

		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		// const rawExclusions: string[] =
		// 	this.flags.exclusions === undefined
		// 		? manifest.policy?.exclusions
		// 		: await readJson(this.flags.exclusions);

		// const exclusions: RegExp[] = rawExclusions.map((e) => new RegExp(e, "i"));

		// const rawHandlerExclusions = manifest?.policy?.handlerExclusions;

		// const handlerExclusions: ExcludedPolicyFileMap = {};
		// if (rawHandlerExclusions) {
		// 	for (const rule of Object.keys(rawHandlerExclusions)) {
		// 		handlerExclusions[rule] = rawHandlerExclusions[rule].map(
		// 			(e) => new RegExp(e, "i"),
		// 		);
		// 	}
		// }

		const filePathsToCheck: string[] = [];
		// const context = await this.getContext();
		// const gitRoot = context.repo.resolvedRoot;

		if (this.flags.stdin) {
			const stdInput = await readStdin();

			if (stdInput !== undefined) {
				filePathsToCheck.push(...stdInput.split("\n"));
			}
		} else {
			// const repo = new Repository({ baseDir: gitRoot });
			const gitFiles =
				(await this.git.raw(
					"ls-files",
					"-co",
					"--exclude-standard",
					"--full-name",
				)) ?? "";

			filePathsToCheck.push(...gitFiles.split("\n"));
		}

		if (this.commandContext === undefined) {
			this.error("Command context was undefined - fatal error.", {
				exit: 100,
			});
		}

		await this.executePolicy(filePathsToCheck, this.commandContext);
	}

	private async executePolicy(
		pathsToCheck: string[],
		commandContext: CheckPolicyCommandContext,
	): Promise<void> {
		try {
			for (const pathToCheck of pathsToCheck) {
				// eslint-disable-next-line no-await-in-loop
				await this.checkOrExcludeFile(pathToCheck, commandContext);
			}
		} finally {
			this.logStats();
		}
	}

	/**
	 * Routes files to their handlers and resolvers by regex testing their full paths. If a file fails a policy that has a
	 * resolver, the resolver will be invoked as well. Synchronizes the output, exit codes, and resolve
	 * decision for all handlers.
	 */
	private async routeToHandlers(
		file: string,
		commandContext: CheckPolicyCommandContext,
	): Promise<void> {
		const {
			// context,
			policies,
			excludePoliciesForFiles,
			gitRoot,
		} = commandContext;

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

					const result = await runWithPerf(policy.name, "handle", async () =>
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

	private logStats(): void {
		this.log(
			`Statistics: ${this.processed} processed, ${
				this.count - this.processed
			} excluded, ${this.count} total`,
		);
		for (const [action, handlerPerf] of handlerPerformanceData.entries()) {
			this.log(`Performance for "${action}":`);
			for (const [handler, dur] of handlerPerf.entries()) {
				this.log(`\t${handler}: ${dur}ms`);
			}
		}
	}

	/**
	 * Given a string that represents a path to a file in the repo, determines if the file should be checked, and if so,
	 * routes the file to the appropriate handlers.
	 */
	private async checkOrExcludeFile(
		inputPath: string,
		commandContext: CheckPolicyCommandContext,
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

async function runWithPerf<T>(
	name: string,
	action: PolicyAction,
	run: () => Promise<T>,
): Promise<T> {
	const actionMap =
		handlerPerformanceData.get(action) ?? new Map<string, number>();
	let dur = actionMap.get(name) ?? 0;

	const start = Date.now();
	const result = await run();
	dur += Date.now() - start;

	actionMap.set(name, dur);
	handlerPerformanceData.set(action, actionMap);
	return result;
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

function toRegExp(input: string | RegExp): RegExp {
	if (typeof input === "string") {
		return new RegExp(input, "i");
	}
	return input;
}

import { EOL as newline } from "node:os";
import process from "node:process";
import { Flags } from "@oclif/core";
import { StringBuilder } from "@rushstack/node-core-library";
import { call, run } from "effection";
import chalk from "picocolors";

import { BaseRepopoCommand } from "../baseCommand.js";
import type { RepopoCommandContext } from "../context.js";
import { logStats } from "../perf.js";
import {
	isPolicyError,
	isPolicyFixResult,
	type PolicyError,
	type PolicyFailure,
} from "../policy.js";
import { type PolicyFileResult, PolicyRunner } from "../runner.js";

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
	public static override readonly summary =
		"Checks and applies policies to the files in the repository.";

	public static override readonly flags = {
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

		const filePathsToCheck = await this.collectFilePaths();
		const context: RepopoCommandContext = await this.getContext();

		const runner = new PolicyRunner({
			policies: context.policies,
			excludeFromAll: context.excludeFromAll,
			excludePoliciesForFiles: context.excludePoliciesForFiles,
			gitRoot: context.gitRoot,
			resolve: this.flags.fix,
			logger: this.logger,
		});

		const runResults = await run(() => runner.run(filePathsToCheck));

		// Format and log results
		for (const result of runResults.results) {
			this.formatResult(result);
		}

		if (!this.flags.quiet) {
			logStats(runResults.perfStats, this.logger);
		}
	}

	/**
	 * Collects file paths to check from either stdin or git ls-files.
	 */
	private async collectFilePaths(): Promise<string[]> {
		if (this.flags.stdin) {
			const stdInput = await run(function* () {
				return yield* call(() => readStdin());
			});

			if (stdInput !== undefined && stdInput !== null) {
				return stdInput
					.replace(
						// normalize slashes in case they're windows paths
						/\\/g,
						"/",
					)
					.split("\n");
			}

			return [];
		}

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

		return gitFiles
			.replace(
				// normalize slashes in case they're windows paths
				/\\/g,
				"/",
			)
			.split("\n");
	}

	/**
	 * Formats a single policy file result, logging messages and setting exit codes.
	 */
	private formatResult(result: PolicyFileResult): void {
		const { outcome, resolution } = result;

		// Handle fix results (legacy format with resolved property)
		if (isPolicyFixResult(outcome)) {
			this.formatFixResult(outcome.resolved, outcome.file, result.policy);
			return;
		}

		// Handle new PolicyError with fixed property (fix was attempted inline)
		if (isPolicyError(outcome) && outcome.fixed !== undefined) {
			this.formatPolicyErrorFixResult(outcome, result.file, result.policy);
			return;
		}

		// Handle failure with standalone resolver result
		if (resolution !== undefined) {
			this.formatResolutionResult(resolution, result.file, result.policy);
			return;
		}

		// Handle plain failure (no fix attempted)
		// The runner only collects non-true results, but TypeScript needs explicit narrowing
		if (outcome === true) {
			return;
		}
		this.formatPolicyFailure(outcome, result.file, result.policy);
	}

	private formatFixResult(
		resolved: boolean,
		file: string,
		policyName: string,
	): void {
		const messages = new StringBuilder();

		if (resolved) {
			messages.append(
				`Resolved ${policyName} policy failure for file: ${file}`,
			);
		} else {
			messages.append(`Error fixing ${policyName} policy failure in ${file}`);
			process.exitCode = 1;
		}

		this.logMessages(messages);
	}

	private formatPolicyErrorFixResult(
		result: PolicyError,
		file: string,
		policyName: string,
	): void {
		const messages = new StringBuilder();

		if (result.fixed) {
			messages.append(
				`Resolved ${policyName} policy failure for file: ${file}`,
			);
		} else {
			messages.append(`Error fixing ${policyName} policy failure in ${file}`);
			if (result.error) {
				messages.append(`${newline}\t${result.error}`);
			}
			process.exitCode = 1;
		}

		this.logMessages(messages);
	}

	private formatResolutionResult(
		resolution: { resolved: boolean; errorMessages?: string[] },
		file: string,
		_policyName: string,
	): void {
		const messages = new StringBuilder();
		messages.append(`${newline}Attempting to resolve: ${file}`);

		if (!resolution.resolved) {
			process.exitCode = 1;
		}

		if (resolution.errorMessages && resolution.errorMessages.length > 0) {
			messages.append(newline + resolution.errorMessages.join(newline));
		}

		this.logMessages(messages);
	}

	private formatPolicyFailure(
		result: PolicyFailure | PolicyError,
		file: string,
		policyName: string,
	): void {
		const messages = new StringBuilder();

		// Handle both legacy PolicyFailure and new PolicyError formats
		if (isPolicyError(result)) {
			const autoFixable = result.fixable ? chalk.green(" (autofixable)") : "";
			messages.append(
				`'${chalk.bold(policyName)}' policy failure${autoFixable}: ${file}`,
			);
			messages.append(`${newline}\t${result.error}`);
		} else {
			const autoFixable = result.autoFixable
				? chalk.green(" (autofixable)")
				: "";
			messages.append(
				`'${chalk.bold(policyName)}' policy failure${autoFixable}: ${result.file}`,
			);
			if (result.errorMessages?.length > 0) {
				messages.append(
					`${newline}\t${result.errorMessages.join(`${newline}\t`)}`,
				);
			}
		}
		process.exitCode = 1;

		this.logMessages(messages);
	}

	private logMessages(messages: StringBuilder): void {
		if ((process.exitCode ?? 0) === 0) {
			this.info(messages.toString());
		} else {
			this.warning(messages.toString());
		}
	}
}

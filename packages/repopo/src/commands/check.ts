import process from "node:process";
import { Flags } from "@oclif/core";
import { BaseRepopoCommand } from "../baseCommand.js";
import { DEFAULT_CONCURRENCY, validateConcurrency } from "../concurrency.js";
import { parseFilePaths } from "../filePaths.js";
import { logStats } from "../perf.js";
import { readRepositoryFiles } from "../repositoryFiles.js";
import {
	type PolicyExecutionError,
	type PolicyRunFinding,
	runPolicies,
} from "../runner.js";
import { normalizeRepoRelativeFilePath } from "../utils/safePaths.js";

async function readStdin(): Promise<string> {
	if (process.stdin.isTTY) {
		return "";
	}
	process.stdin.setEncoding("utf8");
	let data = "";
	for await (const chunk of process.stdin) {
		data += chunk;
	}
	return data;
}

/** Check selected files and the complete repository inventory. */
export class CheckPolicy<
	T extends typeof BaseRepopoCommand & {
		args: typeof CheckPolicy.args;
		flags: typeof CheckPolicy.flags;
	},
> extends BaseRepopoCommand<T> {
	public static override readonly summary =
		"Checks and applies policies to the files in the repository.";

	public static override readonly description =
		"File policies check selected files. Repository policies always run with the full repository file inventory, " +
		"including with --stdin. With --fix, repository policies can modify files outside the stdin selection.";

	public static override readonly flags = {
		concurrency: Flags.integer({
			description:
				"Maximum concurrent files in read-only checks. Fixes remain sequential.",
			default: DEFAULT_CONCURRENCY,
			parse: async (value) => validateConcurrency(Number(value)),
		}),
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
		const context = await this.getContext();
		const files = await this.collectFilePaths(context.gitRoot);
		this.verbose(`${context.policies.length} policies loaded.`);
		for (const policy of context.policies) {
			this.verbose(policy.instanceId);
		}
		const results = await runPolicies({
			policies: context.policies,
			root: context.gitRoot,
			files,
			inventory: () => this.collectRepositoryFiles(),
			exclude: context.excludeFromAll,
			fix: this.flags.fix,
			concurrency: this.flags.concurrency,
		});
		for (const finding of results.findings) {
			this.reportFinding(finding);
		}
		for (const error of results.errors) {
			this.reportError(error);
		}

		for (const skipped of results.skipped) {
			this.verbose(
				`Skipped ${skipped.policyId}: ${skipped.scope === "file" ? skipped.file : "repository"} (${skipped.reason})`,
			);
		}

		if (!this.flags.quiet) {
			logStats(results.perfStats, this.logger);
		}
	}

	private reportFinding(finding: PolicyRunFinding): void {
		const location =
			finding.scope === "file"
				? finding.file
				: finding.files?.join(", ") || "repository";
		const message = `${finding.policyId}: ${location}: ${finding.message}`;
		if (finding.fixStatus === "fixed") {
			this.info(`Resolved ${message}`);
			return;
		}
		process.exitCode = 1;
		this.warning(message);
		if (finding.manualFix) {
			this.warning(`Manual fix: ${finding.manualFix}`);
		}
	}

	private reportError(error: PolicyExecutionError): void {
		process.exitCode = 1;
		const location =
			error.scope === "file"
				? error.file
				: error.files.join(", ") || "repository";
		this.warning(
			`Execution error (${error.kind}, ${error.phase}) ${error.policyId}: ${location}: ${error.message}`,
		);
	}

	private async collectFilePaths(gitRoot: string): Promise<string[]> {
		const paths = this.flags.stdin
			? parseFilePaths(await readStdin())
			: await this.collectRepositoryFiles();
		return paths.map((filePath) => {
			try {
				return normalizeRepoRelativeFilePath(gitRoot, filePath);
			} catch (error: unknown) {
				const message = error instanceof Error ? error.message : String(error);
				throw new Error(`Invalid file path '${filePath}': ${message}`, {
					cause: error,
				});
			}
		});
	}

	private async collectRepositoryFiles(): Promise<string[]> {
		return readRepositoryFiles(this.git);
	}
}

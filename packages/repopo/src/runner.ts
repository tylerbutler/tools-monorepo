import { all, call, type Operation, run, spawn } from "effection";
import { DEFAULT_CONCURRENCY, validateConcurrency } from "./concurrency.js";
import {
	createExcludedPolicyFileMap,
	type ExcludedPolicyFileMap,
	exclusionRegex,
} from "./context.js";
import { ParsedFileCache } from "./fileCache.js";
import { identifyPolicyInstances } from "./makePolicy.js";
import { newPerfStats, type PolicyHandlerPerfStats } from "./perf.js";
import type {
	ConfiguredPolicy,
	IdentifiedPolicy,
	PolicyFinding,
} from "./policy.js";
import { PolicyExecutor } from "./policyExecution.js";

/** A finding with runner-owned identity and scope-safe location. @public */
export type PolicyRunFinding =
	| (Omit<PolicyFinding, "files"> & {
			scope: "file";
			file: string;
			files?: never;
			policy: string;
			policyId: string;
	  })
	| (PolicyFinding & {
			scope: "repository";
			file?: never;
			policy: string;
			policyId: string;
	  });

/** An execution failure, separate from ordinary policy findings. @public */
export type PolicyExecutionError = {
	policy: string;
	policyId: string;
	phase: "handle" | "resolve";
	kind: "contract" | "exception";
	message: string;
	cause: unknown;
} & (
	| { scope: "file"; file: string; files?: never }
	| { scope: "repository"; files: readonly string[]; file?: never }
);

/** A unit that was not executed. @public */
export type PolicySkippedWork = {
	policy: string;
	policyId: string;
	reason: "excluded" | "file-fix-error" | "repository-fix-error";
} & ({ scope: "file"; file: string } | { scope: "repository"; file?: never });

/** Findings, failures, skipped units, and file/per-instance timing statistics. @public */
export interface PolicyRunResults {
	findings: PolicyRunFinding[];
	errors: PolicyExecutionError[];
	skipped: PolicySkippedWork[];
	perfStats: PolicyHandlerPerfStats;
}

/** Full repository inventory, never inferred from a file selection. @public */
export type RepositoryInventory =
	| readonly string[]
	| (() => Promise<readonly string[]>);

/** Shared Promise and Effection runner options. @public */
export interface PolicyRunnerOptions {
	policies: readonly ConfiguredPolicy[];
	root: string;
	inventory?: RepositoryInventory | undefined;
	/** Selection limits only file policies. Defaults to inventory when supplied. */
	files?: readonly string[] | undefined;
	exclude?: readonly (string | RegExp)[] | undefined;
	fix?: boolean | undefined;
	concurrency?: number | undefined;
	signal?: AbortSignal | undefined;
}

function matches(regex: RegExp, file: string): boolean {
	const index = regex.lastIndex;
	try {
		regex.lastIndex = 0;
		return regex.test(file);
	} finally {
		regex.lastIndex = index;
	}
}

/** Effection runner; cancellation unwinds active generator handlers and resolvers. @public */
export class PolicyRunner {
	private readonly policies: IdentifiedPolicy[];
	private readonly exclusions: RegExp[];
	private readonly policyExclusions: ExcludedPolicyFileMap;
	private readonly concurrency: number;

	public constructor(private readonly options: PolicyRunnerOptions) {
		this.policies = identifyPolicyInstances(
			options.policies.map((policy) => ({
				...policy,
				config:
					policy.config === undefined ? policy.defaultConfig : policy.config,
			})),
		);
		this.exclusions = (options.exclude ?? []).map(exclusionRegex);
		this.policyExclusions = createExcludedPolicyFileMap(this.policies);
		this.concurrency = validateConcurrency(
			options.concurrency ?? DEFAULT_CONCURRENCY,
		);
		if (
			this.policies.some((policy) => policy.scope === "repository") &&
			options.inventory === undefined
		) {
			throw new TypeError(
				"Repository policies require an explicit inventory array or loader; files is only a selection.",
			);
		}
		for (const policy of this.policies) {
			if (policy.scope === "repository" && policy.resolver !== undefined) {
				throw new TypeError(
					"Repository policies support inline fixes only; remove resolver.",
				);
			}
			if (
				policy.requiresConfig &&
				policy.config === undefined &&
				policy.defaultConfig === undefined
			) {
				throw new TypeError(`Policy '${policy.name}' requires config.`);
			}
		}
	}

	public *run(): Operation<PolicyRunResults> {
		const signal = this.options.signal;
		if (signal?.aborted) {
			throw signal.reason;
		}
		const task = yield* spawn(() => this.runInternal());
		// halt() is lazy; consuming it initiates teardown. The task retains any teardown error.
		const abort = () => {
			task.halt().catch(() => undefined);
		};
		signal?.addEventListener("abort", abort, { once: true });
		try {
			if (signal?.aborted) {
				abort();
			}
			return yield* task;
		} finally {
			signal?.removeEventListener("abort", abort);
		}
	}

	private *runInternal(): Operation<PolicyRunResults> {
		const result: PolicyRunResults = {
			findings: [],
			errors: [],
			skipped: [],
			perfStats: newPerfStats(),
		};
		const fix = this.options.fix ?? false;
		const cache = fix ? undefined : new ParsedFileCache();
		let inventory: readonly string[] | undefined;
		if (this.options.files === undefined) {
			inventory = yield* this.loadInventory();
		}
		const files = this.options.files ?? inventory ?? [];
		let fileFixError = false;
		try {
			if (fix) {
				for (const file of files) {
					if (yield* this.runFile(file, result, cache)) {
						fileFixError = true;
					}
				}
			} else {
				yield* this.runReadOnlyFiles(files, result, cache);
			}
		} finally {
			cache?.clear();
		}
		yield* this.runRepositories(result, inventory, fileFixError);
		return result;
	}

	private *runReadOnlyFiles(
		files: readonly string[],
		result: PolicyRunResults,
		cache: ParsedFileCache | undefined,
	): Operation<void> {
		const entries = files.entries();
		const outputs: PolicyRunResults[] = [];
		const runner = this;
		yield* all(
			Array.from(
				{ length: Math.min(this.concurrency, files.length) },
				function* () {
					for (
						let entry = entries.next();
						!entry.done;
						entry = entries.next()
					) {
						const [index, file] = entry.value;
						const local: PolicyRunResults = {
							findings: [],
							errors: [],
							skipped: [],
							perfStats: result.perfStats,
						};
						yield* runner.runFile(file, local, cache);
						outputs[index] = local;
					}
				},
			),
		);
		for (const output of outputs) {
			result.findings.push(...output.findings);
			result.errors.push(...output.errors);
			result.skipped.push(...output.skipped);
		}
	}

	private *runRepositories(
		result: PolicyRunResults,
		initialInventory: readonly string[] | undefined,
		fileFixError: boolean,
	): Operation<void> {
		let inventory = initialInventory;
		const fix = this.options.fix ?? false;
		let repositoryFixError = false;
		for (const policy of this.policies) {
			if (policy.scope !== "repository") {
				continue;
			}
			if (fileFixError || repositoryFixError) {
				result.skipped.push({
					scope: "repository",
					policy: policy.name,
					policyId: policy.instanceId,
					reason: fileFixError ? "file-fix-error" : "repository-fix-error",
				});
				continue;
			}
			if (inventory === undefined || fix) {
				inventory = yield* this.loadInventory();
			}
			const eligible = (inventory ?? []).filter(
				(file) => !this.excluded(file, policy),
			);
			repositoryFixError = yield* new PolicyExecutor(
				this.options.root,
				fix,
			).repository(policy, eligible, result);
		}
	}

	private *loadInventory(): Operation<readonly string[] | undefined> {
		const inventory = this.options.inventory;
		return typeof inventory === "function" ? yield* call(inventory) : inventory;
	}

	private excluded(file: string, policy: IdentifiedPolicy): boolean {
		return (
			this.exclusions.some((regex) => matches(regex, file)) ||
			(this.policyExclusions.get(policy.instanceId) ?? []).some((regex) =>
				matches(regex, file),
			)
		);
	}

	private *runFile(
		file: string,
		output: PolicyRunResults,
		cache: ParsedFileCache | undefined,
	): Operation<boolean> {
		output.perfStats.count++;
		const globallyExcluded = this.exclusions.some((regex) =>
			matches(regex, file),
		);
		if (!globallyExcluded) {
			output.perfStats.processed++;
		}
		let stopped = false;
		for (const policy of this.policies) {
			if (policy.scope === "repository" || !matches(policy.match, file)) {
				continue;
			}
			if (stopped || this.excluded(file, policy)) {
				output.skipped.push({
					scope: "file",
					file,
					policy: policy.name,
					policyId: policy.instanceId,
					reason: stopped ? "file-fix-error" : "excluded",
				});
				continue;
			}
			stopped = yield* new PolicyExecutor(
				this.options.root,
				this.options.fix ?? false,
			).file(file, policy, output, cache);
		}
		return stopped;
	}
}

/** Promise entry point sharing the Effection runner's contracts and cancellation. @public */
export async function runPolicies(
	options: PolicyRunnerOptions,
): Promise<PolicyRunResults> {
	const runner = new PolicyRunner(options);
	return await run(() => runner.run());
}

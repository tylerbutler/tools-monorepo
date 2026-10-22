import { all, call, type Operation, run, spawn } from "effection";
import { DEFAULT_CONCURRENCY, validateConcurrency } from "./concurrency.js";
import { exclusionRegex } from "./context.js";
import { fileCache, ParsedFileCache } from "./fileCache.js";
import { identifyPolicyInstances } from "./makePolicy.js";
import {
	newPerfStats,
	type PolicyHandlerPerfStats,
	runWithPerf,
} from "./perf.js";
import type {
	ConfiguredPolicy,
	IdentifiedPolicy,
	PolicyFinding,
	PolicyResult,
} from "./policy.js";

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
	inventory?: RepositoryInventory;
	/** Selection limits only file policies. Defaults to inventory when supplied. */
	files?: readonly string[];
	exclude?: readonly (string | RegExp)[];
	fix?: boolean;
	concurrency?: number;
	signal?: AbortSignal;
}

class ExecutionContractError extends TypeError {}
const windowsAbsolutePath = /^[A-Za-z]:/;

function* execute<T>(handler: () => Promise<T> | Operation<T>): Operation<T> {
	const execution = handler();
	if (execution instanceof Promise) {
		return yield* call(() => execution);
	}
	if (
		typeof execution === "object" &&
		execution !== null &&
		Symbol.iterator in execution &&
		!Array.isArray(execution)
	) {
		return yield* execution;
	}
	throw new ExecutionContractError(
		"Handlers and resolvers must be async functions or Effection generators.",
	);
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

function validPath(path: unknown): path is string {
	return (
		typeof path === "string" &&
		path.length > 0 &&
		!path.includes("\\") &&
		!path.includes("\0") &&
		!path.startsWith("/") &&
		!windowsAbsolutePath.test(path) &&
		path
			.split("/")
			.every((part) => part !== "" && part !== "." && part !== "..")
	);
}

function validateResult(
	result: unknown,
	repository: boolean,
	fix: boolean,
): asserts result is PolicyResult {
	const invalid = () =>
		new ExecutionContractError(
			"Policy handlers and resolvers must return readonly PolicyFinding[] with message, optional manualFix, fixStatus and repository-only files; legacy results are not supported.",
		);
	if (!Array.isArray(result)) {
		throw invalid();
	}
	for (const finding of result) {
		if (
			typeof finding !== "object" ||
			finding === null ||
			Array.isArray(finding) ||
			Reflect.ownKeys(finding).some(
				(key) =>
					typeof key !== "string" ||
					!["message", "manualFix", "fixStatus", "files"].includes(key),
			) ||
			!("message" in finding) ||
			typeof finding.message !== "string" ||
			finding.message.length === 0 ||
			("manualFix" in finding &&
				finding.manualFix !== undefined &&
				typeof finding.manualFix !== "string") ||
			("fixStatus" in finding &&
				finding.fixStatus !== undefined &&
				!["available", "fixed", "failed"].includes(finding.fixStatus)) ||
			(!fix &&
				(finding.fixStatus === "fixed" || finding.fixStatus === "failed")) ||
			("files" in finding &&
				!(
					repository &&
					Array.isArray(finding.files) &&
					finding.files.every(validPath)
				))
		) {
			throw invalid();
		}
	}
}

function mergeFindings(
	checked: PolicyResult,
	resolved: PolicyResult,
): PolicyResult {
	// Messages identify independent findings within one invocation. Omission is not resolution.
	const merged = [...checked];
	const used = new Set<number>();
	for (const finding of resolved) {
		const index = checked.findIndex(
			(previous, candidateIndex) =>
				!used.has(candidateIndex) && previous.message === finding.message,
		);
		if (index === -1) {
			merged.push(finding);
		} else if (merged[index]?.fixStatus !== "fixed") {
			merged[index] = { ...merged[index], ...finding };
			used.add(index);
		}
	}
	return merged;
}

/** Effection runner; cancellation unwinds active generator handlers and resolvers. @public */
export class PolicyRunner {
	private readonly policies: IdentifiedPolicy[];
	private readonly exclusions: RegExp[];
	private readonly concurrency: number;

	public constructor(private readonly options: PolicyRunnerOptions) {
		this.policies = identifyPolicyInstances(options.policies);
		this.exclusions = (options.exclude ?? []).map(exclusionRegex);
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
			repositoryFixError = yield* this.runRepositoryPolicy(
				policy,
				eligible,
				result,
			);
		}
	}

	private *runRepositoryPolicy(
		policy: Extract<IdentifiedPolicy, { scope: "repository" }>,
		eligible: readonly string[],
		result: PolicyRunResults,
	): Operation<boolean> {
		const fix = this.options.fix ?? false;
		try {
			const findings = yield* runWithPerf(
				policy.instanceId,
				"handle",
				result.perfStats,
				() =>
					execute(() =>
						policy.handler({
							files: eligible,
							root: this.options.root,
							resolve: fix,
							config: policy.config,
						}),
					),
			);
			validateResult(findings, true, fix);
			for (const finding of findings) {
				result.findings.push({
					...finding,
					scope: "repository",
					policy: policy.name,
					policyId: policy.instanceId,
				});
			}
		} catch (cause: unknown) {
			result.errors.push({
				scope: "repository",
				files: eligible,
				policy: policy.name,
				policyId: policy.instanceId,
				phase: "handle",
				kind:
					cause instanceof ExecutionContractError ? "contract" : "exception",
				message: cause instanceof Error ? cause.message : String(cause),
				cause,
			});
			return fix;
		}
		return false;
	}

	private *loadInventory(): Operation<readonly string[] | undefined> {
		const inventory = this.options.inventory;
		return typeof inventory === "function" ? yield* call(inventory) : inventory;
	}

	private excluded(file: string, policy: IdentifiedPolicy): boolean {
		return (
			this.exclusions.some((regex) => matches(regex, file)) ||
			(policy.exclude ?? []).some((pattern) =>
				matches(exclusionRegex(pattern), file),
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
			stopped = yield* this.runFilePolicy(file, policy, output, cache);
		}
		return stopped;
	}

	private *runFilePolicy(
		file: string,
		policy: Exclude<IdentifiedPolicy, { scope: "repository" }>,
		output: PolicyRunResults,
		cache: ParsedFileCache | undefined,
	): Operation<boolean> {
		let stopped = false;
		let phase: "handle" | "resolve" = "handle";
		let checked: PolicyResult = [];
		try {
			const fix = this.options.fix ?? false;
			const args = {
				file,
				root: this.options.root,
				resolve: fix,
				config: policy.config,
				[fileCache]: cache,
			};
			checked = yield* runWithPerf(
				policy.instanceId,
				"handle",
				output.perfStats,
				() => execute(() => policy.handler(args)),
			);
			validateResult(checked, false, fix);
			if (
				fix &&
				checked.length > 0 &&
				policy.resolver &&
				!checked.some(
					(finding) =>
						finding.fixStatus === "fixed" || finding.fixStatus === "failed",
				)
			) {
				phase = "resolve";
				const resolver = policy.resolver;
				const resolved = yield* runWithPerf(
					policy.instanceId,
					"resolve",
					output.perfStats,
					() =>
						execute(() =>
							resolver({
								file,
								root: args.root,
								config: args.config,
								findings: checked,
							}),
						),
				);
				validateResult(resolved, false, true);
				checked = mergeFindings(checked, resolved);
			}
		} catch (cause: unknown) {
			output.errors.push({
				scope: "file",
				file,
				policy: policy.name,
				policyId: policy.instanceId,
				phase,
				kind:
					cause instanceof ExecutionContractError ? "contract" : "exception",
				message: cause instanceof Error ? cause.message : String(cause),
				cause,
			});
			stopped = this.options.fix ?? false;
			if (phase === "handle") {
				checked = [];
			}
		}
		for (const { files: _files, ...finding } of checked) {
			output.findings.push({
				...finding,
				scope: "file",
				file,
				policy: policy.name,
				policyId: policy.instanceId,
			});
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

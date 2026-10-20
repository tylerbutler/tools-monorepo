import type { Logger } from "@tylerbu/cli-api";
import { all, call, type Operation } from "effection";
import { DEFAULT_CONCURRENCY, validateConcurrency } from "./concurrency.js";
import type { RepopoConfig } from "./config.js";
import {
	createExcludedPolicyFileMap,
	type ExcludedPolicyFileMap,
} from "./context.js";
import { fileCache, ParsedFileCache } from "./fileCache.js";
import { identifyPolicyInstances } from "./makePolicy.js";
import {
	newPerfStats,
	type PolicyHandlerPerfStats,
	runWithPerf,
} from "./perf.js";
import type {
	IdentifiedPolicy,
	PolicyFixResult,
	PolicyHandlerResult,
	PolicyInstanceId,
	PolicyName,
	PolicyStandaloneResolver,
	RepositoryPolicyFinding,
} from "./policy.js";
import { isPolicyError, isPolicyFixResult } from "./policy.js";

function isOperation<T>(value: unknown): value is Operation<T> {
	return (
		typeof value === "object" &&
		value !== null &&
		"next" in value &&
		typeof (value as { next: unknown }).next === "function"
	);
}

function matches(regex: RegExp, value: string): boolean {
	if (!(regex.global || regex.sticky)) {
		return regex.test(value);
	}

	const savedLastIndex = regex.lastIndex;
	try {
		regex.lastIndex = 0;
		return regex.test(value);
	} finally {
		regex.lastIndex = savedLastIndex;
	}
}

/**
 * Result of running a single policy on a single file.
 * @alpha
 */
export interface PolicyFileResult {
	scope?: "file";
	file: string;
	policy: PolicyName;
	/** Stable identity of the configured policy instance */
	policyId: PolicyInstanceId;
	/** The raw result from the policy handler */
	outcome: PolicyHandlerResult;
	/** Set when a standalone resolver was attempted (legacy resolver path) */
	resolution?: PolicyFixResult;
}

/** @alpha */
export interface PolicyRepositoryResult {
	scope: "repository";
	policy: PolicyName;
	policyId: PolicyInstanceId;
	outcome: RepositoryPolicyFinding;
	/** Repository findings use `outcome.files`, not a synthetic file path. */
	file?: never;
}

/** @alpha */
export type PolicyExecutionResult = PolicyFileResult | PolicyRepositoryResult;

/**
 * Aggregated results from a full policy run.
 * @alpha
 */
export interface PolicyRunResults {
	results: PolicyExecutionResult[];
	perfStats: PolicyHandlerPerfStats;
}

interface PolicyRunState {
	results: PolicyExecutionResult[];
	perfStats: PolicyHandlerPerfStats;
	cache?: ParsedFileCache | undefined;
}

/**
 * Options for configuring a {@link PolicyRunner}.
 * @alpha
 */
export interface PolicyRunnerOptions {
	policies: NonNullable<RepopoConfig["policies"]>;
	excludeFromAll: RegExp[];
	excludePoliciesForFiles: ExcludedPolicyFileMap;
	gitRoot: string;
	resolve: boolean;
	logger?: Pick<Logger, "verbose">;
	/** Maximum active files in read-only checks. Defaults to 8; fixes remain sequential. */
	concurrency?: number;
}

/**
 * Runs configured policies against files and collects results.
 * @alpha
 */
export class PolicyRunner {
	private readonly policies: IdentifiedPolicy[];
	private readonly excludeFromAll: RegExp[];
	private readonly excludePoliciesForFiles: ExcludedPolicyFileMap;
	private readonly gitRoot: string;
	private readonly resolve: boolean;
	private readonly logger: Pick<Logger, "verbose"> | undefined;
	private readonly concurrency: number;

	public constructor(options: PolicyRunnerOptions) {
		this.policies = identifyPolicyInstances(options.policies);
		this.excludeFromAll = options.excludeFromAll;
		this.excludePoliciesForFiles = createExcludedPolicyFileMap(this.policies);
		for (const [instanceId, exclusions] of options.excludePoliciesForFiles) {
			this.excludePoliciesForFiles.set(instanceId, exclusions);
		}
		this.gitRoot = options.gitRoot;
		this.resolve = options.resolve;
		this.logger = options.logger;
		this.concurrency = validateConcurrency(
			options.concurrency ?? DEFAULT_CONCURRENCY,
		);
	}

	/**
	 * Run file policies on the selection, then repository policies on the full inventory.
	 * Supply a loader to refresh the inventory after fixes, including repository fixes.
	 */
	public *run(
		filePaths: string[],
		repositoryFiles:
			| readonly string[]
			| (() => Promise<readonly string[]>) = filePaths,
	): Operation<PolicyRunResults> {
		const state: PolicyRunState = {
			results: [],
			perfStats: newPerfStats(),
		};

		const cache = this.resolve ? undefined : new ParsedFileCache();
		try {
			if (this.resolve) {
				for (const filePath of filePaths) {
					yield* this.checkOrExcludeFile(filePath, state);
				}
			} else {
				const files = filePaths.entries();
				const results: PolicyExecutionResult[][] = [];
				const runner = this;
				yield* all(
					Array.from(
						{ length: Math.min(this.concurrency, filePaths.length) },
						function* () {
							for (
								let entry = files.next();
								!entry.done;
								entry = files.next()
							) {
								const [index, filePath] = entry.value;
								const fileState: PolicyRunState = {
									results: [],
									perfStats: state.perfStats,
									cache,
								};
								yield* runner.checkOrExcludeFile(filePath, fileState);
								results[index] = fileState.results;
							}
						},
					),
				);
				state.results = results.flat();
			}
		} finally {
			cache?.clear();
		}

		let inventory: readonly string[] | undefined;
		for (const policy of this.policies) {
			if (policy.scope !== "repository") {
				continue;
			}
			if (inventory === undefined || this.resolve) {
				inventory =
					typeof repositoryFiles === "function"
						? yield* call(repositoryFiles)
						: repositoryFiles;
			}
			const files = inventory.filter(
				(file) =>
					!(
						this.excludeFromAll.some((regex) => matches(regex, file)) ||
						this.isPolicyExcluded(file, policy)
					),
			);
			yield* this.runRepositoryPolicy(policy, files, state);
		}

		return {
			results: state.results,
			perfStats: state.perfStats,
		};
	}

	private *runRepositoryPolicy(
		policy: Extract<IdentifiedPolicy, { scope: "repository" }>,
		files: readonly string[],
		state: PolicyRunState,
	): Operation<void> {
		try {
			const { gitRoot, resolve } = this;
			const result = yield* runWithPerf(
				policy.instanceId,
				"handle",
				state.perfStats,
				function* () {
					const execution = policy.handler({
						root: gitRoot,
						files,
						resolve,
						config: policy.config,
					});
					if (execution instanceof Promise) {
						return yield* call(() => execution);
					}
					if (isOperation(execution)) {
						return yield* execution;
					}
					throw new Error("Unexpected repository handler result type.");
				},
			);
			if (result === true) {
				return;
			}
			if (!(Array.isArray(result) && result.every(isPolicyError))) {
				throw new Error(
					"Repository handler must return true or an array of findings.",
				);
			}
			for (const outcome of result) {
				state.results.push({
					scope: "repository",
					policy: policy.name,
					policyId: policy.instanceId,
					outcome,
				});
			}
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			state.results.push({
				scope: "repository",
				policy: policy.name,
				policyId: policy.instanceId,
				outcome: {
					error: `System Error: Error executing repository policy '${policy.instanceId}': ${message}`,
				},
			});
		}
	}

	private *checkOrExcludeFile(
		relPath: string,
		state: PolicyRunState,
	): Operation<void> {
		state.perfStats.count++;
		try {
			yield* this.routeToPolicies(relPath, state);
		} catch (error: unknown) {
			throw new Error(
				`Error routing ${relPath} to handler: ${error}\nStack:\n${(error as Error).stack}`,
			);
		}
	}

	private *routeToPolicies(
		relPath: string,
		state: PolicyRunState,
	): Operation<void> {
		if (this.excludeFromAll.some((regex) => matches(regex, relPath))) {
			this.logger?.verbose(`Excluded all handlers: ${relPath}`);
			return;
		}

		state.perfStats.processed++;

		const matchingPolicies = this.policies.filter(
			(policy): policy is Extract<IdentifiedPolicy, { match: RegExp }> =>
				policy.scope !== "repository" && matches(policy.match, relPath),
		);
		if (this.resolve) {
			// Fixers can read and rewrite the same file.
			for (const policy of matchingPolicies) {
				yield* this.runPolicyOnFile(relPath, policy, state);
			}
			return;
		}

		yield* all(
			matchingPolicies.map((policy) => {
				return this.runPolicyOnFile(relPath, policy, state);
			}),
		);
	}

	private *runPolicyOnFile(
		relPath: string,
		policy: Extract<IdentifiedPolicy, { match: RegExp }>,
		state: PolicyRunState,
	): Operation<void> {
		if (this.isPolicyExcluded(relPath, policy)) {
			this.logger?.verbose(
				`Excluded from '${policy.instanceId}' policy: ${relPath}`,
			);
			return;
		}

		try {
			const result = yield* this.executePolicyHandler(relPath, policy, state);

			// Success — nothing to report
			if (result === true) {
				return;
			}

			const fileResult: PolicyFileResult = {
				file: relPath,
				policy: policy.name,
				policyId: policy.instanceId,
				outcome: result,
			};

			// Check if resolution should be attempted: result is a failure that
			// wasn't already fixed, resolve mode is on, and a standalone resolver exists.
			const alreadyFixed =
				isPolicyFixResult(result) ||
				(isPolicyError(result) && result.fixed !== undefined);

			if (!alreadyFixed && this.resolve && policy.resolver) {
				const resolution = yield* this.attemptResolution(
					relPath,
					policy,
					policy.resolver,
					state,
				);
				fileResult.resolution = resolution;
			}

			state.results.push(fileResult);
		} catch (error: unknown) {
			const message = error instanceof Error ? error.message : String(error);
			state.results.push({
				file: relPath,
				policy: policy.name,
				policyId: policy.instanceId,
				outcome: {
					error: `System Error: Error executing policy '${policy.instanceId}' for file '${relPath}': ${message}`,
				},
			});
		}
	}

	private isPolicyExcluded(relPath: string, policy: IdentifiedPolicy): boolean {
		return (
			this.excludePoliciesForFiles
				.get(policy.instanceId)
				?.some((regex) => matches(regex, relPath)) ?? false
		);
	}

	private *executePolicyHandler(
		relPath: string,
		policy: Extract<IdentifiedPolicy, { match: RegExp }>,
		state: PolicyRunState,
	): Operation<PolicyHandlerResult> {
		const { resolve, gitRoot } = this;

		const result = yield* runWithPerf(
			policy.instanceId,
			"handle",
			state.perfStats,
			function* () {
				const args = {
					file: relPath,
					root: gitRoot,
					resolve,
					config: policy.config,
					[fileCache]: state.cache,
				};

				if (policy._internalHandler) {
					return yield* policy._internalHandler(args);
				}

				const handlerResult = policy.handler(args);
				if (handlerResult instanceof Promise) {
					return yield* call(() => handlerResult);
				}
				if (isOperation<PolicyHandlerResult>(handlerResult)) {
					return yield* handlerResult;
				}
				throw new Error(
					`Unexpected handler result type: ${typeof handlerResult}`,
				);
			},
		);

		if (result === undefined) {
			throw new Error("Policy result was undefined.");
		}

		return result;
	}

	private *attemptResolution(
		relPath: string,
		policy: Extract<IdentifiedPolicy, { match: RegExp }>,
		resolver: PolicyStandaloneResolver,
		state: PolicyRunState,
	): Operation<PolicyFixResult> {
		const { gitRoot } = this;

		return yield* runWithPerf(
			policy.instanceId,
			"resolve",
			state.perfStats,
			function* () {
				const result = resolver({
					file: relPath,
					root: gitRoot,
					config: policy.config,
				});
				if (result instanceof Promise) {
					return yield* call(() => result);
				}
				if (isOperation<PolicyFixResult>(result)) {
					return yield* result;
				}
				throw new Error(`Unexpected resolver result type: ${typeof result}`);
			},
		);
	}
}

import type { Logger } from "@tylerbu/cli-api";
import { all, call, type Operation } from "effection";

import {
	createExcludedPolicyFileMap,
	type ExcludedPolicyFileMap,
} from "./context.js";
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
	PolicyInstance,
	PolicyInstanceId,
	PolicyName,
	PolicyStandaloneResolver,
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
	file: string;
	policy: PolicyName;
	/** Stable identity of the configured policy instance */
	policyId: PolicyInstanceId;
	/** The raw result from the policy handler */
	outcome: PolicyHandlerResult;
	/** Set when a standalone resolver was attempted (legacy resolver path) */
	resolution?: PolicyFixResult;
}

/**
 * Aggregated results from a full policy run.
 * @alpha
 */
export interface PolicyRunResults {
	results: PolicyFileResult[];
	perfStats: PolicyHandlerPerfStats;
}

interface PolicyRunState {
	results: PolicyFileResult[];
	perfStats: PolicyHandlerPerfStats;
}

/**
 * Options for configuring a {@link PolicyRunner}.
 * @alpha
 */
export interface PolicyRunnerOptions {
	policies: PolicyInstance[];
	excludeFromAll: RegExp[];
	excludePoliciesForFiles: ExcludedPolicyFileMap;
	gitRoot: string;
	resolve: boolean;
	logger?: Pick<Logger, "verbose">;
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
	}

	public *run(filePaths: string[]): Operation<PolicyRunResults> {
		const state: PolicyRunState = {
			results: [],
			perfStats: newPerfStats(),
		};

		for (const filePath of filePaths) {
			yield* this.checkOrExcludeFile(filePath, state);
		}

		return {
			results: state.results,
			perfStats: state.perfStats,
		};
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

		const matchingPolicies = this.policies.filter((policy) =>
			matches(policy.match, relPath),
		);
		yield* all(
			matchingPolicies.map((policy) => {
				return this.runPolicyOnFile(relPath, policy, state);
			}),
		);
	}

	private *runPolicyOnFile(
		relPath: string,
		policy: IdentifiedPolicy,
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
			throw new Error(
				`Error executing policy '${policy.instanceId}' for file '${relPath}': ${error}`,
			);
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
		policy: IdentifiedPolicy,
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
		policy: IdentifiedPolicy,
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

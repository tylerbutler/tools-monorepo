import type { Logger } from "@tylerbu/cli-api";
import { all, call, type Operation } from "effection";

import type { ExcludedPolicyFileMap } from "./context.js";
import {
	newPerfStats,
	type PolicyHandlerPerfStats,
	runWithPerf,
} from "./perf.js";
import type {
	PolicyFixResult,
	PolicyHandlerResult,
	PolicyInstance,
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

/**
 * Result of running a single policy on a single file.
 * @alpha
 */
export interface PolicyFileResult {
	file: string;
	policy: PolicyName;
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
	private readonly policies: PolicyInstance[];
	private readonly excludeFromAll: RegExp[];
	private readonly excludePoliciesForFiles: ExcludedPolicyFileMap;
	private readonly gitRoot: string;
	private readonly resolve: boolean;
	private readonly logger: Pick<Logger, "verbose"> | undefined;

	private readonly results: PolicyFileResult[] = [];
	private readonly perfStats: PolicyHandlerPerfStats = newPerfStats();

	public constructor(options: PolicyRunnerOptions) {
		this.policies = options.policies;
		this.excludeFromAll = options.excludeFromAll;
		this.excludePoliciesForFiles = options.excludePoliciesForFiles;
		this.gitRoot = options.gitRoot;
		this.resolve = options.resolve;
		this.logger = options.logger;
	}

	public *run(filePaths: string[]): Operation<PolicyRunResults> {
		for (const filePath of filePaths) {
			yield* this.checkOrExcludeFile(filePath);
		}

		return {
			results: this.results,
			perfStats: this.perfStats,
		};
	}

	private *checkOrExcludeFile(relPath: string): Operation<void> {
		this.perfStats.count++;
		try {
			yield* this.routeToPolicies(relPath);
		} catch (error: unknown) {
			throw new Error(
				`Error routing ${relPath} to handler: ${error}\nStack:\n${(error as Error).stack}`,
			);
		}
	}

	private *routeToPolicies(relPath: string): Operation<void> {
		if (this.excludeFromAll.some((regex) => regex.test(relPath))) {
			this.logger?.verbose(`Excluded all handlers: ${relPath}`);
			return;
		}

		const matchingPolicies = this.policies.filter((policy) =>
			policy.match.test(relPath),
		);
		yield* all(
			matchingPolicies.map((policy) => {
				return this.runPolicyOnFile(relPath, policy);
			}),
		);
	}

	private *runPolicyOnFile(
		relPath: string,
		policy: PolicyInstance,
	): Operation<void> {
		if (this.isPolicyExcluded(relPath, policy)) {
			this.logger?.verbose(`Excluded from '${policy.name}' policy: ${relPath}`);
			return;
		}

		try {
			const result = yield* this.executePolicyHandler(relPath, policy);

			// Success — nothing to report
			if (result === true) {
				return;
			}

			const fileResult: PolicyFileResult = {
				file: relPath,
				policy: policy.name,
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
				);
				fileResult.resolution = resolution;
			}

			this.results.push(fileResult);
		} catch (error: unknown) {
			throw new Error(
				`Error executing policy '${policy.name}' for file '${relPath}': ${error}`,
			);
		}
	}

	private isPolicyExcluded(relPath: string, policy: PolicyInstance): boolean {
		return (
			this.excludePoliciesForFiles
				.get(policy.name)
				?.some((regex) => regex.test(relPath)) ?? false
		);
	}

	private *executePolicyHandler(
		relPath: string,
		policy: PolicyInstance,
	): Operation<PolicyHandlerResult> {
		const { resolve, gitRoot, perfStats } = this;

		const result = yield* runWithPerf(
			policy.name,
			"handle",
			perfStats,
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
		policy: PolicyInstance,
		resolver: PolicyStandaloneResolver,
	): Operation<PolicyFixResult> {
		const { gitRoot, perfStats } = this;

		return yield* runWithPerf(policy.name, "resolve", perfStats, function* () {
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
		});
	}
}

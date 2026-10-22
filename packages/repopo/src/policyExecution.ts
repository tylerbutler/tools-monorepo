import { types } from "node:util";
import type { Operation } from "effection";
import { ExecutionContractError } from "./executionContractError.js";
import { fileCache, type ParsedFileCache } from "./fileCache.js";
import { runWithPerf } from "./perf.js";
import type { IdentifiedPolicy, PolicyResult } from "./policy.js";
import type { PolicyRunResults } from "./runner.js";
import { settlePolicyPromise } from "./settlePolicyPromise.js";

const windowsAbsolutePath = /^[A-Za-z]:/;

function* execute<T>(handler: () => Promise<T> | Operation<T>): Operation<T> {
	const execution = handler();
	if (execution instanceof Promise) {
		return yield* settlePolicyPromise(execution);
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
					(finding.files === undefined ||
						(Array.isArray(finding.files) && finding.files.every(validPath)))
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
	// Omission is not resolution; messages identify independent findings.
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

function nativeErrorMessage(cause: object): string | undefined {
	let current: object | null = cause;
	while (current && !types.isProxy(current)) {
		const descriptor = Object.getOwnPropertyDescriptor(current, "message");
		if (descriptor) {
			return "value" in descriptor && typeof descriptor.value === "string"
				? descriptor.value
				: undefined;
		}
		current = Object.getPrototypeOf(current);
	}
	return undefined;
}

/** Describe thrown values without allowing hostile coercion to discard a run. */
export function executionMessage(cause: unknown): string {
	try {
		if (
			cause === null ||
			(typeof cause !== "object" && typeof cause !== "function")
		) {
			return String(cause);
		}
		const message =
			!types.isProxy(cause) && types.isNativeError(cause)
				? nativeErrorMessage(cause)
				: undefined;
		return message ?? "Policy threw a non-Error or uninspectable value.";
	} catch {
		return "Policy threw a value that cannot be inspected.";
	}
}

function errorKind(cause: unknown): "contract" | "exception" {
	try {
		if (
			cause === null ||
			(typeof cause !== "object" && typeof cause !== "function")
		) {
			return "exception";
		}
		let current: object | null = cause;
		while (current && !types.isProxy(current)) {
			if (current === ExecutionContractError.prototype) {
				return "contract";
			}
			current = Object.getPrototypeOf(current);
		}
		return "exception";
	} catch {
		return "exception";
	}
}

/** Internal single-policy execution; engines own matching and scheduling. */
export class PolicyExecutor {
	public constructor(
		private readonly root: string,
		private readonly fix: boolean,
	) {}

	public *repository(
		policy: Extract<IdentifiedPolicy, { scope: "repository" }>,
		eligible: readonly string[],
		output: PolicyRunResults,
	): Operation<boolean> {
		try {
			const findings = yield* runWithPerf(
				policy.instanceId,
				"handle",
				output.perfStats,
				() =>
					execute(() =>
						policy.handler({
							files: eligible,
							root: this.root,
							resolve: this.fix,
							config: policy.config,
						}),
					),
			);
			validateResult(findings, true, this.fix);
			for (const finding of findings) {
				output.findings.push({
					...finding,
					scope: "repository",
					policy: policy.name,
					policyId: policy.instanceId,
				});
			}
		} catch (cause: unknown) {
			output.errors.push({
				scope: "repository",
				files: eligible,
				policy: policy.name,
				policyId: policy.instanceId,
				phase: "handle",
				kind: errorKind(cause),
				message: executionMessage(cause),
				cause,
			});
			return this.fix;
		}
		return false;
	}

	public *file(
		file: string,
		policy: Exclude<IdentifiedPolicy, { scope: "repository" }>,
		output: PolicyRunResults,
		cache: ParsedFileCache | undefined,
	): Operation<boolean> {
		let stopped = false;
		let phase: "handle" | "resolve" = "handle";
		let checked: PolicyResult = [];
		try {
			const args = {
				file,
				root: this.root,
				resolve: this.fix,
				config: policy.config,
				[fileCache]: cache,
			};
			checked = yield* runWithPerf(
				policy.instanceId,
				"handle",
				output.perfStats,
				() => execute(() => policy.handler(args)),
			);
			validateResult(checked, false, this.fix);
			if (
				this.fix &&
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
								findings: checked.map((finding) => ({ ...finding })),
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
				kind: errorKind(cause),
				message: executionMessage(cause),
				cause,
			});
			stopped = this.fix;
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

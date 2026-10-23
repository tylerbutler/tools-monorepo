/**
 * QuickJS Bridge - Policy dispatch layer for in-process execution.
 *
 * This module is imported by the esbuild-generated entry point. It:
 * 1. Receives the loaded repopo config
 * 2. Indexes policies by position
 * 3. Exposes handler/resolver batch functions on globalThis for Rust to call
 * 4. Stores serialized metadata on globalThis for Rust to read
 *
 * All dispatch functions avoid async/await to minimize microtask depth.
 * Handlers are called directly; if they return Promises (because they're
 * declared async), those are resolved via a flat .then() chain. Rust pumps
 * the QuickJS event loop after calling the sync wrapper to drain microtasks.
 */

import { identifyPolicyInstances } from "../../esm/makePolicy.js";
import { run } from "./effection-shim.mjs";

/** @type {Array<any>} */
let policiesArray = [];

/**
 * Check if a value is an Effection Operation (generator).
 */
function isOperation(value) {
	return (
		typeof value === "object" &&
		value !== null &&
		"next" in value &&
		typeof value.next === "function"
	);
}

/**
 * Serialize a RegExp for the Rust side.
 */
function serializeRegex(regex) {
	return {
		source: regex.source,
		flags: regex.flags,
	};
}

/**
 * Serialize policy metadata for the Rust side.
 */
function serializePolicy(policy) {
	const match =
		policy.scope === "repository"
			? { source: "", flags: "" }
			: serializeRegex(policy.match);
	const excludeFiles = (policy.excludeFiles ?? policy.exclude ?? []).map(
		(e) => {
			if (e instanceof RegExp) return serializeRegex(e);
			return String(e);
		},
	);

	return {
		name: policy.name,
		instanceId: policy.instanceId,
		scope: policy.scope ?? "file",
		description: policy.description,
		matchPattern: match.source,
		matchFlags: match.flags,
		hasResolver: typeof policy.resolver === "function",
		excludeFiles,
	};
}

/**
 * Call a handler and normalize its return to a Promise.
 * Handles sync returns, async returns, and generator (Effection) returns.
 */
function callHandler(handler, args) {
	try {
		const result = handler(args);

		if (result && typeof result.then === "function") {
			// Already a Promise (async handler)
			return result;
		}

		if (isOperation(result)) {
			// Generator — run to completion
			return run(function* () {
				return yield* result;
			});
		}

		// Sync result — wrap in resolved Promise for uniform handling
		return Promise.resolve(result);
	} catch (err) {
		return Promise.reject(err);
	}
}

/**
 * Process a handler result into pass/fail arrays.
 */
function processResult(file, result, pass, fail) {
	if (result === true) {
		pass.push(file);
	} else {
		fail.push({
			file,
			error: result?.error,
			errorMessages: result?.errorMessages,
			fixable: result?.fixable ?? result?.autoFixable,
			fixed: result?.fixed ?? result?.resolved,
			manualFix: result?.manualFix,
		});
	}
}

/**
 * Initialize the bridge with a loaded repopo config.
 * Sets up dispatch functions on globalThis for Rust to call.
 *
 * @param {object} config - The loaded RepopoConfig
 */
export function initBridge(config) {
	const policies = identifyPolicyInstances(config.policies ?? []);
	policiesArray = policies;

	// Storage for async results (Rust reads after pumping the event loop)
	globalThis.__repopo_lastResult = null;
	globalThis.__repopo_lastError = null;

	const globalExclusions = (config.excludeFiles ?? []).map(exclusionRegex);

	globalThis.__repopo_runRepositoryPolicySync = function (
		policyId,
		filesJson,
		root,
		resolve,
	) {
		globalThis.__repopo_lastResult = null;
		globalThis.__repopo_lastError = null;

		const policy = policiesArray[policyId];
		const wrapFinding = (outcome) => ({
			scope: "repository",
			policy: policy?.name ?? String(policyId),
			policyId: policy?.instanceId ?? String(policyId),
			outcome,
		});
		const fail = (err) => {
			globalThis.__repopo_lastResult = JSON.stringify([
				wrapFinding({
					error: `System Error: Error executing repository policy '${policy?.instanceId ?? policyId}': ${err?.message ?? String(err)}`,
				}),
			]);
		};

		try {
			if (!policy || policy.scope !== "repository") {
				throw new Error(`Unknown repository policy index: ${policyId}`);
			}
			const exclusions = [
				...globalExclusions,
				...(policy.excludeFiles ?? policy.exclude ?? []).map(exclusionRegex),
			];
			const inventory =
				typeof filesJson === "string" ? JSON.parse(filesJson) : filesJson;
			const files = inventory.filter(
				(file) => !exclusions.some((regex) => matches(regex, file)),
			);
			callHandler(policy.handler, {
				root,
				files,
				resolve,
				config: policy.config,
			})
				.then((result) => {
					if (result === true) {
						globalThis.__repopo_lastResult = "[]";
						return;
					}
					if (
						!(
							Array.isArray(result) &&
							Array.from(result).every(isRepositoryFinding)
						)
					) {
						throw new Error(
							"Repository handler must return true or an array of findings.",
						);
					}
					globalThis.__repopo_lastResult = JSON.stringify(
						result.map(wrapFinding),
					);
				})
				.catch(fail);
		} catch (err) {
			fail(err);
		}
	};

	// --- Handler batch ---
	// Calls handlers directly (no async/await) and chains Promises
	// using .then() to minimize microtask depth.

	globalThis.__repopo_runHandlerBatchSync = function (
		policyId,
		filesJson,
		root,
		resolve,
	) {
		globalThis.__repopo_lastResult = null;
		globalThis.__repopo_lastError = null;

		const policy = policiesArray[policyId];
		if (!policy) {
			globalThis.__repopo_lastResult = JSON.stringify({
				pass: [],
				fail: [{ file: "", error: `Unknown policy index: ${policyId}` }],
			});
			return;
		}

		const handler = policy._internalHandler ?? policy.handler;
		const files =
			typeof filesJson === "string" ? JSON.parse(filesJson) : filesJson;
		const pass = [];
		const fail = [];

		// Build a sequential Promise chain: each file is processed after the previous one
		let chain = Promise.resolve();
		for (const file of files) {
			chain = chain.then(() => {
				const args = { file, root, resolve, config: policy.config };
				return callHandler(handler, args).then(
					(result) => processResult(file, result, pass, fail),
					(err) => {
						fail.push({
							file,
							error: `Handler error: ${err?.message ?? String(err)}`,
							fixable: false,
						});
					},
				);
			});
		}

		chain.then(
			() => {
				globalThis.__repopo_lastResult = JSON.stringify({ pass, fail });
			},
			(err) => {
				globalThis.__repopo_lastResult = JSON.stringify({
					pass: [],
					fail: [
						{ file: "", error: `Batch error: ${err?.message ?? String(err)}` },
					],
				});
			},
		);
	};

	// --- Resolver batch ---

	globalThis.__repopo_runResolverBatchSync = function (
		policyId,
		filesJson,
		root,
	) {
		globalThis.__repopo_lastResult = null;
		globalThis.__repopo_lastError = null;

		const policy = policiesArray[policyId];
		if (!policy) {
			globalThis.__repopo_lastResult = JSON.stringify({
				pass: [],
				fail: [{ file: "", error: `Unknown policy index: ${policyId}` }],
			});
			return;
		}

		if (typeof policy.resolver !== "function") {
			globalThis.__repopo_lastResult = JSON.stringify({
				pass: [],
				fail: [{ file: "", error: `Policy index ${policyId} has no resolver` }],
			});
			return;
		}

		const files =
			typeof filesJson === "string" ? JSON.parse(filesJson) : filesJson;
		const pass = [];
		const fail = [];

		let chain = Promise.resolve();
		for (const file of files) {
			chain = chain.then(() => {
				const args = { file, root, config: policy.config };
				return callHandler(policy.resolver, args).then(
					(result) => processResult(file, result, pass, fail),
					(err) => {
						fail.push({
							file,
							error: `Resolver error: ${err?.message ?? String(err)}`,
							fixable: false,
							fixed: false,
						});
					},
				);
			});
		}

		chain.then(
			() => {
				globalThis.__repopo_lastResult = JSON.stringify({ pass, fail });
			},
			(err) => {
				globalThis.__repopo_lastResult = JSON.stringify({
					pass: [],
					fail: [
						{
							file: "",
							error: `Batch error: ${err?.message ?? String(err)}`,
						},
					],
				});
			},
		);
	};

	// Serialize policy metadata and store on globalThis for Rust to read
	const serializedPolicies = policies.map(serializePolicy);
	const excludeFiles = (config.excludeFiles ?? []).map((e) => {
		if (e instanceof RegExp) return serializeRegex(e);
		return String(e);
	});

	const metadata = {
		policies: serializedPolicies,
		excludeFiles,
	};
	globalThis.__repopo_metadata = JSON.stringify(metadata);
}

function exclusionRegex(pattern) {
	return typeof pattern === "string" ? new RegExp(pattern, "i") : pattern;
}

function matches(regex, file) {
	regex.lastIndex = 0;
	return regex.test(file);
}

function isRepositoryFinding(value) {
	return (
		typeof value === "object" &&
		value !== null &&
		typeof value.error === "string" &&
		(value.files === undefined ||
			(Array.isArray(value.files) &&
				Array.from(value.files).every((file) => typeof file === "string"))) &&
		(value.fixed === undefined || typeof value.fixed === "boolean") &&
		(value.fixable === undefined || typeof value.fixable === "boolean") &&
		(value.manualFix === undefined || typeof value.manualFix === "string")
	);
}

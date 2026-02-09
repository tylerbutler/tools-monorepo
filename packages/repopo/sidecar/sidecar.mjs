/**
 * Node.js sidecar process for repopo-core (Rust).
 *
 * This process loads the TypeScript repopo configuration and executes
 * policy handlers on behalf of the Rust core engine. Communication
 * happens over stdin/stdout using newline-delimited JSON.
 *
 * Protocol:
 *   Rust -> Node: JSON request (one per line)
 *   Node -> Rust: JSON response (one per line)
 *
 * Request format:
 *   { "method": "load_config", "params": { "configPath": "...", "gitRoot": "..." } }
 *   { "method": "run_handler", "params": { "policyName": "...", "file": "...", "root": "...", "resolve": false } }
 *   { "method": "run_resolver", "params": { "policyName": "...", "file": "...", "root": "..." } }
 *   { "method": "shutdown" }
 *
 * Response format:
 *   { "ok": true, "data": ... }
 *   { "ok": false, "error": "message" }
 */

import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { TypeScriptLoader } from "@tylerbu/lilconfig-loader-ts";
import { run } from "effection";
import { lilconfig } from "lilconfig";

/** @type {Map<string, import("../src/policy.js").ConfiguredPolicy>} */
let policiesByName = new Map();

/** @type {import("../src/config.js").RepopoConfig | undefined} */
let loadedConfig = undefined;

/**
 * Respond to the Rust side with a JSON message on stdout.
 * @param {object} response
 */
function respond(response) {
	const json = JSON.stringify(response);
	process.stdout.write(json + "\n");
}

/**
 * Serialize a RegExp to a pattern string and flags for the Rust side.
 * @param {RegExp} regex
 * @returns {{ source: string, flags: string }}
 */
function serializeRegex(regex) {
	return {
		source: regex.source,
		flags: regex.flags,
	};
}

/**
 * Serialize policy metadata for the Rust side.
 * Strips out functions and sends only what Rust needs for matching.
 * @param {import("../src/policy.js").ConfiguredPolicy} policy
 * @returns {object}
 */
function serializePolicy(policy) {
	const match = serializeRegex(policy.match);

	// Convert excludeFiles to regex pattern strings
	const excludeFiles = (policy.excludeFiles ?? policy.exclude ?? []).map(
		(e) => {
			if (e instanceof RegExp) {
				return e.source;
			}
			return String(e);
		},
	);

	return {
		name: policy.name,
		description: policy.description,
		matchPattern: match.source,
		matchFlags: match.flags,
		hasResolver: typeof policy.resolver === "function",
		excludeFiles,
	};
}

/**
 * Check if a value is an Effection Operation (generator).
 * @param {unknown} value
 * @returns {boolean}
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
 * Execute a policy handler, handling both async and generator (Effection) return types.
 * @param {import("../src/policy.js").PolicyHandler} handler
 * @param {import("../src/policy.js").PolicyArgs} args
 * @returns {Promise<import("../src/policy.js").PolicyHandlerResult>}
 */
async function executeHandler(handler, args) {
	const result = handler(args);

	if (result instanceof Promise) {
		return result;
	}

	if (isOperation(result)) {
		// Run the generator through Effection
		return run(function* () {
			return yield* result;
		});
	}

	// Shouldn't happen, but handle it
	return result;
}

/**
 * Handle a load_config request.
 * @param {object} params
 */
async function handleLoadConfig(params) {
	try {
		const searchPath = params.configPath ?? process.cwd();

		// Load config using lilconfig (same mechanism as CommandWithConfig)
		const configLoader = lilconfig("repopo", {
			searchPlaces: [
				"repopo.config.ts",
				"repopo.config.mjs",
				"repopo.config.cjs",
			],
			loaders: {
				".ts": TypeScriptLoader,
			},
		});

		const pathStats = await stat(searchPath);
		const maybeConfig = pathStats.isDirectory()
			? await configLoader.search(searchPath)
			: await configLoader.load(searchPath);

		if (maybeConfig !== null) {
			loadedConfig = maybeConfig.config?.default ?? maybeConfig.config;
		} else {
			// Use default config
			const { DefaultPolicyConfig } = await import("../esm/config.js");
			loadedConfig = DefaultPolicyConfig;
		}

		// Build the policy map
		policiesByName.clear();
		const policies = loadedConfig?.policies ?? [];
		for (const p of policies) {
			policiesByName.set(p.name, p);
		}

		// Serialize for Rust
		const serializedPolicies = policies.map(serializePolicy);
		const excludeFiles = (loadedConfig?.excludeFiles ?? []).map((e) => {
			if (e instanceof RegExp) {
				return e.source;
			}
			return String(e);
		});

		respond({
			ok: true,
			data: {
				policies: serializedPolicies,
				excludeFiles,
			},
		});
	} catch (err) {
		respond({
			ok: false,
			error: `Failed to load config: ${err.message}`,
		});
	}
}

/**
 * Handle a run_handler request.
 * @param {object} params
 */
async function handleRunHandler(params) {
	try {
		const policy = policiesByName.get(params.policyName);
		if (!policy) {
			respond({
				ok: false,
				error: `Unknown policy: ${params.policyName}`,
			});
			return;
		}

		const handler = policy._internalHandler ?? policy.handler;
		const args = {
			file: params.file,
			root: params.root,
			resolve: params.resolve ?? false,
			config: policy.config,
		};

		const result = await executeHandler(handler, args);

		// Serialize the result — `true` passes through as-is,
		// objects (PolicyError/PolicyFailure) are serialized.
		respond({ ok: true, data: result });
	} catch (err) {
		respond({
			ok: false,
			error: `Handler error for ${params.policyName}: ${err.message}`,
		});
	}
}

/**
 * Handle a run_resolver request.
 * @param {object} params
 */
async function handleRunResolver(params) {
	try {
		const policy = policiesByName.get(params.policyName);
		if (!policy) {
			respond({
				ok: false,
				error: `Unknown policy: ${params.policyName}`,
			});
			return;
		}

		if (typeof policy.resolver !== "function") {
			respond({
				ok: false,
				error: `Policy ${params.policyName} has no resolver`,
			});
			return;
		}

		const args = {
			file: params.file,
			root: params.root,
			config: policy.config,
		};

		const result = await executeHandler(policy.resolver, args);
		respond({ ok: true, data: result });
	} catch (err) {
		respond({
			ok: false,
			error: `Resolver error for ${params.policyName}: ${err.message}`,
		});
	}
}

/**
 * Main loop: read JSON requests from stdin, dispatch, respond on stdout.
 */
async function main() {
	const rl = createInterface({
		input: process.stdin,
		terminal: false,
	});

	for await (const line of rl) {
		if (!line.trim()) continue;

		let request;
		try {
			request = JSON.parse(line);
		} catch {
			respond({ ok: false, error: `Invalid JSON: ${line}` });
			continue;
		}

		const { method, params } = request;

		switch (method) {
			case "load_config":
				await handleLoadConfig(params ?? {});
				break;

			case "run_handler":
				await handleRunHandler(params ?? {});
				break;

			case "run_resolver":
				await handleRunResolver(params ?? {});
				break;

			case "shutdown":
				process.exit(0);
				break;

			default:
				respond({ ok: false, error: `Unknown method: ${method}` });
		}
	}

	// stdin closed — exit cleanly
	process.exit(0);
}

main().catch((err) => {
	process.stderr.write(`Sidecar fatal error: ${err.message}\n`);
	process.exit(1);
});

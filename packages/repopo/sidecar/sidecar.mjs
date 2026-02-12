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
 *   { "method": "run_handler_batch", "params": { "policyName": "...", "files": [...], "root": "...", "resolve": false } }
 *   { "method": "run_resolver_batch", "params": { "policyName": "...", "files": [...], "root": "..." } }
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

// --- CLI argument parsing ---

function parseSidecarArgs(argv) {
	const result = { mode: "ipc", gitRoot: process.cwd(), config: undefined };
	for (let i = 0; i < argv.length; i++) {
		if (argv[i] === "--mode" && argv[i + 1]) {
			result.mode = argv[++i];
		} else if (argv[i].startsWith("--mode=")) {
			result.mode = argv[i].slice("--mode=".length);
		} else if (argv[i] === "--git-root" && argv[i + 1]) {
			result.gitRoot = argv[++i];
		} else if (argv[i].startsWith("--git-root=")) {
			result.gitRoot = argv[i].slice("--git-root=".length);
		} else if (argv[i] === "--config" && argv[i + 1]) {
			result.config = argv[++i];
		} else if (argv[i].startsWith("--config=")) {
			result.config = argv[i].slice("--config=".length);
		}
	}
	return result;
}

const sidecarArgs = parseSidecarArgs(process.argv.slice(2));

/** @type {Map<string, import("../src/policy.js").ConfiguredPolicy>} */
let policiesByName = new Map();

/** @type {Array<import("../src/policy.js").ConfiguredPolicy>} */
let policiesByIndex = [];

/** @type {string} */
let storedGitRoot = "";

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

		// Store git root for reuse in batch calls
		storedGitRoot = params.gitRoot ?? process.cwd();

		// Build the policy map and index array
		policiesByName.clear();
		policiesByIndex = [];
		const policies = loadedConfig?.policies ?? [];
		for (const p of policies) {
			policiesByName.set(p.name, p);
			policiesByIndex.push(p);
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
 * Handle a run_handler_batch request.
 * Runs the handler for each file sequentially and returns compact results.
 * Accepts policyId (index) and uses stored gitRoot.
 * @param {object} params
 */
async function handleRunHandlerBatch(params) {
	try {
		const policy = policiesByIndex[params.policyId];
		if (!policy) {
			respond({
				ok: false,
				error: `Unknown policy index: ${params.policyId}`,
			});
			return;
		}

		const handler = policy._internalHandler ?? policy.handler;
		const resolve = params.resolve ?? false;
		/** @type {string[]} */
		const pass = [];
		/** @type {Array<{file: string, error?: string, errorMessages?: string[], fixable?: boolean, fixed?: boolean, manualFix?: string}>} */
		const fail = [];

		for (const file of params.files) {
			try {
				const args = {
					file,
					root: storedGitRoot,
					resolve,
					config: policy.config,
				};
				const result = await executeHandler(handler, args);
				if (result === true) {
					pass.push(file);
				} else {
					fail.push({
						file,
						error: result.error,
						errorMessages: result.errorMessages,
						fixable: result.fixable,
						fixed: result.fixed,
						manualFix: result.manualFix,
					});
				}
			} catch (err) {
				fail.push({
					file,
					error: `Handler error: ${err.message}`,
					fixable: false,
				});
			}
		}

		respond({ ok: true, data: { pass, fail } });
	} catch (err) {
		respond({
			ok: false,
			error: `Batch handler error for policy index ${params.policyId}: ${err.message}`,
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
 * Handle a run_resolver_batch request.
 * Runs the resolver for each file sequentially and returns compact results.
 * Accepts policyId (index) and uses stored gitRoot.
 * @param {object} params
 */
async function handleRunResolverBatch(params) {
	try {
		const policy = policiesByIndex[params.policyId];
		if (!policy) {
			respond({
				ok: false,
				error: `Unknown policy index: ${params.policyId}`,
			});
			return;
		}

		if (typeof policy.resolver !== "function") {
			respond({
				ok: false,
				error: `Policy index ${params.policyId} has no resolver`,
			});
			return;
		}

		/** @type {string[]} */
		const pass = [];
		/** @type {Array<{file: string, error?: string, errorMessages?: string[], fixable?: boolean, fixed?: boolean, manualFix?: string}>} */
		const fail = [];

		for (const file of params.files) {
			try {
				const args = {
					file,
					root: storedGitRoot,
					config: policy.config,
				};
				const result = await executeHandler(policy.resolver, args);
				if (result === true) {
					pass.push(file);
				} else {
					fail.push({
						file,
						error: result.error,
						errorMessages: result.errorMessages,
						fixable: result.fixable,
						fixed: result.fixed,
						manualFix: result.manualFix,
					});
				}
			} catch (err) {
				fail.push({
					file,
					error: `Resolver error: ${err.message}`,
					fixable: false,
					fixed: false,
				});
			}
		}

		respond({ ok: true, data: { pass, fail } });
	} catch (err) {
		respond({
			ok: false,
			error: `Batch resolver error for policy index ${params.policyId}: ${err.message}`,
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

			case "run_handler_batch":
				await handleRunHandlerBatch(params ?? {});
				break;

			case "run_resolver_batch":
				await handleRunResolverBatch(params ?? {});
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

/**
 * Bundle mode: load config, bundle all policies with esbuild for QuickJS, and exit.
 *
 * Output (JSON to stdout):
 *   { policies: [...], excludeFiles: [...], bundle: "...js code..." }
 */
async function bundleMode() {
	const { build } = await import("esbuild");
	const { join, dirname } = await import("node:path");
	const {
		writeFileSync: fsWriteFileSync,
		unlinkSync: fsUnlinkSync,
	} = await import("node:fs");
	const { tmpdir } = await import("node:os");
	const { fileURLToPath } = await import("node:url");

	const __dirname = dirname(fileURLToPath(import.meta.url));
	const shimsDir = join(__dirname, "shims");
	const searchPath = sidecarArgs.config ?? sidecarArgs.gitRoot;

	// Step 1: Find config file
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

	if (!maybeConfig) {
		process.stderr.write("No repopo config found\n");
		process.exit(1);
	}

	const configFilePath = maybeConfig.filepath;

	// Step 2: Generate entry point that imports config and bridge
	const tmpEntry = join(tmpdir(), `repopo-entry-${Date.now()}.mjs`);
	const entryCode = [
		"// Process polyfill for QuickJS",
		"if (typeof globalThis.process === 'undefined') {",
		"  globalThis.process = {",
		"    cwd: () => globalThis.__process_cwd?.() ?? '/',",
		"    env: {},",
		"    platform: 'linux',",
		"    version: 'v18.0.0',",
		"    stdout: { write: () => {} },",
		"    stderr: { write: (s) => globalThis.__stderr_write?.(s) },",
		"    exit: () => {},",
		"  };",
		"}",
		"",
		`import config from ${JSON.stringify(configFilePath)};`,
		`import { initBridge } from ${JSON.stringify(join(shimsDir, "quickjs-bridge.mjs"))};`,
		"",
		"const resolvedConfig = config.default ?? config;",
		"initBridge(resolvedConfig);",
	].join("\n");

	fsWriteFileSync(tmpEntry, entryCode);

	try {
		// Step 3: Bundle with esbuild using shim plugin
		const shimAliases = new Map([
			["fs", join(shimsDir, "fs-shim.mjs")],
			["node:fs", join(shimsDir, "fs-shim.mjs")],
			["graceful-fs", join(shimsDir, "fs-shim.mjs")],
			["fs-extra", join(shimsDir, "fs-shim.mjs")],
			["fs/promises", join(shimsDir, "fs-promises-shim.mjs")],
			["node:fs/promises", join(shimsDir, "fs-promises-shim.mjs")],
			["path", join(shimsDir, "path-shim.mjs")],
			["node:path", join(shimsDir, "path-shim.mjs")],
			["os", join(shimsDir, "os-shim.mjs")],
			["node:os", join(shimsDir, "os-shim.mjs")],
			["url", join(shimsDir, "url-shim.mjs")],
			["node:url", join(shimsDir, "url-shim.mjs")],
			["assert", join(shimsDir, "assert-shim.mjs")],
			["node:assert", join(shimsDir, "assert-shim.mjs")],
			["node:assert/strict", join(shimsDir, "assert-shim.mjs")],
			["effection", join(shimsDir, "effection-shim.mjs")],
		]);

		// Node.js builtins that we don't have shims for.
		// These get a no-op stub so transitive dependencies don't fail at bundle time.
		const nodeBuiltins = new Set([
			"buffer",
			"child_process",
			"cluster",
			"console",
			"constants",
			"crypto",
			"dgram",
			"dns",
			"domain",
			"events",
			"http",
			"http2",
			"https",
			"inspector",
			"module",
			"net",
			"perf_hooks",
			"process",
			"punycode",
			"querystring",
			"readline",
			"repl",
			"stream",
			"string_decoder",
			"sys",
			"timers",
			"tls",
			"tty",
			"util",
			"v8",
			"vm",
			"worker_threads",
			"zlib",
		]);

		// npm packages that are NOT needed for policy execution and should be
		// stubbed out. These are CLI infrastructure, git clients, etc. that
		// only run in Node.js and pull in heavy transitive dependency trees.
		// Packages that need special inline handling
		const inlineModules = new Map([
			[
				"git-hooks-list",
				// git-hooks-list reads index.json via import.meta.url which is empty in IIFE.
				// Inline the data directly to avoid the runtime file read.
				`export default ["applypatch-msg","pre-applypatch","post-applypatch","pre-commit","pre-merge-commit","prepare-commit-msg","commit-msg","post-commit","pre-rebase","post-checkout","post-merge","pre-push","pre-receive","update","proc-receive","post-receive","post-update","reference-transaction","push-to-checkout","pre-auto-gc","post-rewrite","sendemail-validate","fsmonitor-watchman","p4-changelist","p4-prepare-changelist","p4-post-changelist","p4-pre-submit","post-index-change"];`,
			],
		]);

		const npmPackagesToStub = new Set([
			"@oclif/core",
			"@oclif/errors",
			"@oclif/parser",
			"simple-git",
			"jiti",
			"lilconfig",
			"execa",
			"cross-spawn",
			"human-signals",
			"which",
			"isexe",
		]);

		const shimPlugin = {
			name: "quickjs-shims",
			setup(build) {
				// 1. Resolve modules we have shims for (both bare and node: prefixed)
				build.onResolve({ filter: /^[^./]/ }, (args) => {
					const shimPath = shimAliases.get(args.path);
					if (shimPath) return { path: shimPath };

					// Inline modules that need special handling
					if (inlineModules.has(args.path)) {
						return { path: args.path, namespace: "inline-module" };
					}

					// Stub heavy npm packages not needed for policy execution
					const pkgName = args.path.startsWith("@")
						? args.path.split("/").slice(0, 2).join("/")
						: args.path.split("/")[0];
					if (npmPackagesToStub.has(pkgName)) {
						return { path: args.path, namespace: "node-stub" };
					}

					return null;
				});

				// Load inline modules
				build.onLoad(
					{ filter: /.*/, namespace: "inline-module" },
					(args) => ({
						contents: inlineModules.get(args.path),
						loader: "js",
					}),
				);

				// 2. Stub unshimmed node: prefixed builtins
				build.onResolve({ filter: /^node:/ }, (args) => {
					return { path: args.path, namespace: "node-stub" };
				});

				// 3. Stub bare Node.js builtins that aren't shimmed
				build.onResolve({ filter: /^[a-z]/ }, (args) => {
					const baseName = args.path.split("/")[0];
					if (nodeBuiltins.has(baseName)) {
						return { path: args.path, namespace: "node-stub" };
					}
					return null;
				});

				// Virtual module loader: returns a lenient no-op stub in CJS format.
				// CJS format is critical: esbuild can't statically validate CJS exports,
				// so any named import (Buffer, EventEmitter, etc.) will resolve via
				// the Proxy at bundle time without errors.
				//
				// Key design: The Proxy returns itself from getPrototypeOf so that
				// when esbuild's __toESM does Object.create(getPrototypeOf(mod)),
				// the resulting object inherits from the Proxy. This means ANY
				// property access on the __toESM result falls through to the Proxy's
				// get trap, which returns noop. Without this, __toESM creates a plain
				// object and only copies enumerable own properties (losing the trap).
				build.onLoad(
					{ filter: /.*/, namespace: "node-stub" },
					() => {
						return {
							contents: `
								function noop() { return stub; }
								const handler = {
									get(_, prop) {
										if (prop === '__esModule') return true;
										if (prop === 'then') return undefined;
										return stub;
									},
									getPrototypeOf() { return stub; },
									apply() { return stub; },
									construct() { return stub; },
								};
								const stub = new Proxy(noop, handler);
								module.exports = stub;
							`,
							loader: "js",
						};
					},
				);
			},
		};

		const result = await build({
			entryPoints: [tmpEntry],
			bundle: true,
			write: false,
			format: "iife",
			platform: "neutral",
			mainFields: ["module", "main"],
			target: "es2020",
			plugins: [shimPlugin],
			logLevel: "warning",
		});

		if (result.errors.length > 0) {
			process.stderr.write(
				`esbuild errors: ${JSON.stringify(result.errors)}\n`,
			);
			process.exit(1);
		}

		const bundleCode = result.outputFiles[0].text;

		// Step 4: Serialize policy metadata (reuse loaded config)
		const loadedConfig =
			maybeConfig.config?.default ?? maybeConfig.config;
		const policies = (loadedConfig?.policies ?? []).map(serializePolicy);
		const excludeFiles = (loadedConfig?.excludeFiles ?? []).map((e) => {
			if (e instanceof RegExp) return e.source;
			return String(e);
		});

		// Step 5: Output JSON to stdout
		const output = JSON.stringify({
			policies,
			excludeFiles,
			bundle: bundleCode,
		});
		// Wait for the write to fully flush before exiting.
		// process.exit() terminates immediately and can truncate piped stdout.
		const flushed = process.stdout.write(output + "\n");
		if (flushed) {
			process.exit(0);
		} else {
			process.stdout.once("drain", () => process.exit(0));
		}
	} finally {
		try {
			fsUnlinkSync(tmpEntry);
		} catch (_) {}
	}
}

// --- Entry point ---

if (sidecarArgs.mode === "bundle") {
	bundleMode().catch((err) => {
		process.stderr.write(
			`Bundle mode error: ${err.message}\n${err.stack}\n`,
		);
		process.exit(1);
	});
} else {
	main().catch((err) => {
		process.stderr.write(`Sidecar fatal error: ${err.message}\n`);
		process.exit(1);
	});
}

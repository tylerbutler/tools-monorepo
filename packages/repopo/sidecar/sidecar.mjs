/**
 * Newline-delimited JSON bridge for the native CLI.
 *
 * Rust owns matching and scheduling. This bridge executes only explicitly
 * selected policy units, sharing contracts and reconciliation with `check`.
 */
import { Console } from "node:console";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { types } from "node:util";
import { TypeScriptLoader } from "@tylerbu/lilconfig-loader-ts";
import { all, run } from "effection";
import { lilconfig } from "lilconfig";
import { DefaultPolicyConfig } from "../esm/config.js";
import { exclusionRegex } from "../esm/context.js";
import { ParsedFileCache } from "../esm/fileCache.js";
import { identifyPolicyInstances, makePolicy } from "../esm/makePolicy.js";
import { newPerfStats } from "../esm/perf.js";
import { executionMessage, PolicyExecutor } from "../esm/policyExecution.js";

// Policy logging must not corrupt the JSON response stream.
globalThis.console = new Console(process.stderr);
const nativeStackGetter = Object.getOwnPropertyDescriptor(
	new Error(),
	"stack",
)?.get;
const nativePrepareStackTrace = Object.getOwnPropertyDescriptor(
	Error,
	"prepareStackTrace",
)?.value;

let registration;
let active;
let session;
let interrupted = false;
let closeInput;
for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		interrupted = true;
		active?.abort(new Error(`Sidecar received ${signal}`));
		closeInput?.();
	});
}

async function respond(response) {
	await new Promise((resolve, reject) => {
		process.stdout.write(`${JSON.stringify(response)}\n`, (error) =>
			error ? reject(error) : resolve(),
		);
	});
}

function serializeRegex(regex) {
	return { source: regex.source, flags: regex.flags };
}

function serializeExclusion(pattern) {
	return pattern instanceof RegExp ? serializeRegex(pattern) : pattern;
}

/** Preserve Error's non-enumerable details and safely encode non-JSON causes. */
function serializeCause(value, seen = new WeakSet(), depth = 0) {
	try {
		return serializeValue(value, seen, depth);
	} catch {
		return { type: "uninspectable" };
	}
}

function serializeValue(value, seen, depth) {
	if (value === undefined) return { type: "undefined" };
	if (typeof value === "bigint" || typeof value === "symbol") {
		return { type: typeof value, value: String(value) };
	}
	if (typeof value === "function") return { type: "function" };
	if (typeof value === "number" && !Number.isFinite(value)) {
		return { type: "number", value: String(value) };
	}
	if (value === null || typeof value !== "object") return value;
	// Proxy traps are arbitrary code, including during descriptor inspection.
	if (types.isProxy(value)) return { type: "proxy" };
	if (seen.has(value)) return { type: "circular" };
	if (depth >= 20) return { type: "truncated" };
	seen.add(value);
	try {
		if (Array.isArray(value)) {
			const length = Object.getOwnPropertyDescriptor(value, "length").value;
			const array = Array.from(
				{ length: Math.min(length, 10000) },
				(_, index) => {
					const descriptor = Object.getOwnPropertyDescriptor(
						value,
						String(index),
					);
					return descriptor && "value" in descriptor
						? serializeCause(descriptor.value, seen, depth + 1)
						: { type: descriptor ? "accessor" : "hole" };
				},
			);
			if (length > array.length) array.push({ type: "truncated" });
			return array;
		}
		const entries = [];
		if (types.isNativeError(value)) {
			for (const key of ["name", "message"]) {
				let current = value;
				let found = false;
				while (current && !types.isProxy(current)) {
					const descriptor = Object.getOwnPropertyDescriptor(current, key);
					if (descriptor) {
						found = true;
						entries.push([
							key,
							"value" in descriptor
								? serializeCause(descriptor.value, seen, depth + 1)
								: { type: "accessor" },
						]);
						break;
					}
					current = Object.getPrototypeOf(current);
				}
				if (!found && current) entries.push([key, { type: "proxy" }]);
			}
		}
		for (const key of Object.getOwnPropertyNames(value)) {
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
			// V8 lazily exposes native Error stacks via a native accessor.
			// Never call a user getter or Error.prepareStackTrace hook.
			if (key === "stack" && types.isNativeError(value) && descriptor?.get) {
				const prepare = Object.getOwnPropertyDescriptor(
					Error,
					"prepareStackTrace",
				);
				const plain = ["name", "message"].every((field) => {
					const entry = entries.find(([name]) => name === field)?.[1];
					return entry === undefined || typeof entry === "string";
				});
				if (
					descriptor.get === nativeStackGetter &&
					(!prepare ||
						("value" in prepare &&
							prepare.value === nativePrepareStackTrace)) &&
					plain
				) {
					const stack = descriptor.get.call(value);
					entries.push([
						key,
						typeof stack === "string" ? stack : { type: "uninspectable" },
					]);
					continue;
				}
			}
			entries.push([
				key,
				descriptor && "value" in descriptor
					? serializeCause(descriptor.value, seen, depth + 1)
					: { type: "accessor" },
			]);
		}
		return Object.fromEntries(entries);
	} finally {
		seen.delete(value);
	}
}

function serializeRun(result) {
	return {
		...result,
		errors: result.errors.map((error) => ({
			...error,
			cause: serializeCause(error.cause),
		})),
		perfStats: {
			...result.perfStats,
			data: Object.fromEntries(
				[...result.perfStats.data].map(([action, timings]) => [
					action,
					Object.fromEntries(timings),
				]),
			),
		},
	};
}

async function loadConfig(params) {
	registration = undefined;
	session?.cache?.clear();
	session = undefined;
	const searchPath = params.configPath ?? process.cwd();
	const loader = lilconfig("repopo", {
		searchPlaces: [
			"repopo.config.ts",
			"repopo.config.mjs",
			"repopo.config.cjs",
		],
		loaders: { ".ts": TypeScriptLoader },
	});
	const pathStats = await stat(searchPath);
	const loaded = pathStats.isDirectory()
		? await loader.search(searchPath)
		: await loader.load(searchPath);
	const config =
		loaded?.config?.default ?? loaded?.config ?? DefaultPolicyConfig;
	const policies = identifyPolicyInstances(
		(config.policies ?? DefaultPolicyConfig.policies).map((policy) => {
			if ("excludeFiles" in policy) {
				throw new TypeError(
					"Per-instance excludeFiles is retired; use exclude.",
				);
			}
			return makePolicy(policy, {
				config: policy.config,
				exclude: policy.exclude,
				instanceId: policy.instanceId,
			});
		}),
	);
	const options = {
		policies,
		root: params.gitRoot ?? process.cwd(),
		exclude: config.excludeFiles ?? [],
	};
	options.exclude.forEach(exclusionRegex);
	const metadata = {
		policies: policies.map((policy) => ({
			name: policy.name,
			instanceId: policy.instanceId,
			description: policy.description,
			scope: policy.scope ?? "file",
			...(policy.scope === "repository"
				? {}
				: { match: serializeRegex(policy.match) }),
			hasResolver: typeof policy.resolver === "function",
			exclude: (policy.exclude ?? []).map(serializeExclusion),
		})),
		excludeFiles: options.exclude.map(serializeExclusion),
	};
	registration = options;
	return metadata;
}

function beginRun(params) {
	if (!registration)
		throw new Error("Load configuration before running policies.");
	session?.cache?.clear();
	session = {
		executor: new PolicyExecutor(registration.root, params.fix ?? false),
		cache: params.fix ? undefined : new ParsedFileCache(),
	};
	return {};
}

async function executeUnits(params) {
	if (!registration || !session)
		throw new Error(
			"Load configuration and begin a run before executing units.",
		);
	active = new AbortController();
	const task = run(function* () {
		return yield* all(
			params.units.map((unit) =>
				(function* () {
					const policy = registration.policies.find(
						(entry) => entry.instanceId === unit.policyId,
					);
					if (!policy)
						throw new Error(`Unknown policy instance: ${unit.policyId}`);
					const result = {
						findings: [],
						errors: [],
						skipped: [],
						perfStats: newPerfStats(),
					};
					if (policy.scope === "repository") {
						if (!Array.isArray(unit.files))
							throw new Error("Repository units require explicit inventory.");
						yield* session.executor.repository(policy, unit.files, result);
					} else {
						if (typeof unit.file !== "string")
							throw new Error("File units require a file.");
						yield* session.executor.file(
							unit.file,
							policy,
							result,
							session.cache,
						);
					}
					return serializeRun(result);
				})(),
			),
		);
	});
	const abort = () => {
		task.halt().catch(() => undefined);
	};
	active.signal.addEventListener("abort", abort, { once: true });
	try {
		return await task;
	} finally {
		active.signal.removeEventListener("abort", abort);
		active = undefined;
	}
}

function matchFiles(params) {
	const regex =
		typeof params.pattern === "string"
			? exclusionRegex(params.pattern)
			: new RegExp(params.pattern.source, params.pattern.flags);
	return params.files.map((file) => {
		regex.lastIndex = 0;
		return regex.test(file);
	});
}

async function main() {
	const rl = createInterface({ input: process.stdin, terminal: false });
	closeInput = () => rl.close();
	let closing = false;
	let shutdownRequested = false;
	let pendingWork = 0;
	rl.on("line", (line) => {
		try {
			const { method } = JSON.parse(line);
			if (method === "execute_units") pendingWork++;
			if (method === "shutdown") {
				closing = true;
				shutdownRequested = true;
				if (active || pendingWork > 0) {
					interrupted = true;
					active?.abort(new Error("Native parent requested shutdown"));
				}
			}
		} catch {
			// The request loop reports malformed JSON.
		}
	});
	// A dead native parent closes the pipe. Halt owned operations before exit.
	rl.on("close", () => {
		if (!closing) {
			interrupted = true;
			active?.abort(new Error("Native parent closed the request stream"));
		}
	});
	for await (const line of rl) {
		if (interrupted || shutdownRequested) break;
		if (!line.trim()) continue;
		try {
			const { method, params = {} } = JSON.parse(line);
			if (method === "shutdown") {
				closing = true;
				break;
			}
			let data;
			switch (method) {
				case "load_config":
					data = await loadConfig(params);
					break;
				case "begin_run":
					data = beginRun(params);
					break;
				case "execute_units":
					try {
						data = await executeUnits(params);
					} finally {
						pendingWork--;
					}
					break;
				case "match_files":
					if (!registration)
						throw new Error("Load configuration before matching.");
					data = matchFiles(params);
					break;
				default:
					throw new Error(`Unknown method: ${method}`);
			}
			if (interrupted) break;
			await respond({ ok: true, data });
		} catch (error) {
			if (interrupted) break;
			await respond({
				ok: false,
				error: executionMessage(error),
				cause: serializeCause(error),
			});
		}
		if (interrupted) break;
	}
	closing = true;
	session?.cache?.clear();
	rl.close();
	process.exit(interrupted ? 130 : 0);
}

main().catch((error) => {
	process.stderr.write(`Sidecar fatal error: ${error.message}\n`);
	process.exit(1);
});

/**
 * Newline-delimited JSON bridge for the native CLI.
 *
 * load_config registers canonical configured policies. run_policies executes a
 * complete run in the shared runtime: batching individual policies would break
 * file ordering, fix exception boundaries and run-scoped manifest snapshots.
 */
import { Console } from "node:console";
import { stat } from "node:fs/promises";
import { createInterface } from "node:readline";
import { TypeScriptLoader } from "@tylerbu/lilconfig-loader-ts";
import { lilconfig } from "lilconfig";
import { simpleGit } from "simple-git";
import { DefaultPolicyConfig } from "../esm/config.js";
import { identifyPolicyInstances, makePolicy } from "../esm/makePolicy.js";
import { readRepositoryFiles } from "../esm/repositoryFiles.js";
import { PolicyRunner, runPolicies } from "../esm/runner.js";

// Policy logging must not corrupt the JSON response stream.
globalThis.console = new Console(process.stderr);

let registration;
let active;
let interrupted = false;
for (const signal of ["SIGINT", "SIGTERM"]) {
	process.on(signal, () => {
		interrupted = true;
		active?.abort(new Error(`Sidecar received ${signal}`));
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
	if (value === undefined) return { type: "undefined" };
	if (typeof value === "bigint" || typeof value === "symbol") {
		return { type: typeof value, value: String(value) };
	}
	if (typeof value === "function")
		return { type: "function", name: value.name };
	if (typeof value === "number" && !Number.isFinite(value)) {
		return { type: "number", value: String(value) };
	}
	if (value === null || typeof value !== "object") return value;
	if (seen.has(value)) return { type: "circular" };
	if (depth >= 20) return { type: "truncated" };
	seen.add(value);
	try {
		if (Array.isArray(value)) {
			return value.map((entry) => serializeCause(entry, seen, depth + 1));
		}
		const entries = [];
		if (value instanceof Error) entries.push(["name", value.name]);
		for (const key of Object.getOwnPropertyNames(value)) {
			const descriptor = Object.getOwnPropertyDescriptor(value, key);
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
	// Validate the entire registration before any policy work.
	new PolicyRunner({ ...options, inventory: [] });
	registration = options;
	return {
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
}

async function executeRun(params) {
	if (!registration)
		throw new Error("Load configuration before running policies.");
	active = new AbortController();
	try {
		return serializeRun(
			await runPolicies({
				...registration,
				files: params.files,
				inventory: async () =>
					readRepositoryFiles(simpleGit(registration.root)),
				fix: params.fix ?? false,
				concurrency: params.concurrency,
				signal: active.signal,
			}),
		);
	} finally {
		active = undefined;
	}
}

async function main() {
	const rl = createInterface({ input: process.stdin, terminal: false });
	let closing = false;
	// A dead native parent closes the pipe. Halt owned operations before exit.
	rl.on("close", () => {
		if (!closing) {
			interrupted = true;
			active?.abort(new Error("Native parent closed the request stream"));
		}
	});
	for await (const line of rl) {
		if (interrupted) break;
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
				case "run_policies":
					data = await executeRun(params);
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
				error: error instanceof Error ? error.message : String(error),
				cause: serializeCause(error),
			});
		}
		if (interrupted) break;
	}
	closing = true;
	rl.close();
	process.exit(interrupted ? 130 : 0);
}

main().catch((error) => {
	process.stderr.write(`Sidecar fatal error: ${error.message}\n`);
	process.exit(1);
});

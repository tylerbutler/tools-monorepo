import { spawn } from "node:child_process";
import { randomInt } from "node:crypto";
import { access, mkdtemp, rm, writeFile } from "node:fs/promises";
import { arch, cpus, platform, release, tmpdir } from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { dirname, join, resolve } from "pathe";

/**
 * Measure through process exit, including startup and stdin transfer.
 * @param {string[]} command
 * @param {string} cwd
 * @param {string} [input]
 * @returns {Promise<{milliseconds: number, stdout: string}>}
 */
export async function measure(command, cwd, input = "") {
	const start = performance.now();
	return new Promise((resolvePromise, reject) => {
		const child = spawn(command[0], command.slice(1), { cwd });
		let stdout = "";
		let stderr = "";
		child.stdout.setEncoding("utf8").on("data", (data) => {
			stdout += data;
		});
		child.stderr.setEncoding("utf8").on("data", (data) => {
			stderr += data;
		});
		child.on("error", reject);
		// A process that exits early may close stdin before consuming the snapshot.
		child.stdin.on("error", (error) => {
			if (error.code !== "EPIPE") {
				reject(error);
			}
		});
		child.on("close", (code, signal) => {
			if (code !== 0) {
				reject(
					new Error(
						`${JSON.stringify(command)} exited with ${signal ?? code}\n${stdout}${stderr}`,
					),
				);
				return;
			}
			resolvePromise({ milliseconds: performance.now() - start, stdout });
		});
		child.stdin.end(input);
	});
}

/**
 * Each round runs every case once, in shuffled order, without concurrency.
 * @param {{scenario: string, engine: string, command: string[], input: string}[]} cases
 * @param {{cwd: string, warmup: number, runs: number}} options
 */
export async function runRounds(cases, { cwd, warmup, runs }) {
	const samples = [];
	for (let round = -warmup; round < runs; round++) {
		const ordered = [...cases];
		for (let i = ordered.length - 1; i > 0; i--) {
			const j = randomInt(i + 1);
			[ordered[i], ordered[j]] = [ordered[j], ordered[i]];
		}
		for (const [order, entry] of ordered.entries()) {
			const { milliseconds } = await measure(entry.command, cwd, entry.input);
			if (round >= 0) {
				samples.push({
					scenario: entry.scenario,
					engine: entry.engine,
					round,
					order,
					milliseconds,
				});
			}
		}
		console.log(
			`${round < 0 ? "Warmup" : "Timed"} round ${round < 0 ? round + warmup + 1 : round + 1} complete`,
		);
	}
	return samples;
}

/** @param {number[]} values */
export function summarize(values) {
	const sorted = [...values].sort((a, b) => a - b);
	if (sorted.length === 0) {
		throw new Error("Cannot summarize an empty sample.");
	}
	const quantile = (fraction) => {
		const index = (sorted.length - 1) * fraction;
		const lower = Math.floor(index);
		return (
			sorted[lower] +
			(sorted[Math.ceil(index)] - sorted[lower]) * (index - lower)
		);
	};
	const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
	return {
		median: quantile(0.5),
		mean,
		stddev:
			values.length < 2
				? 0
				: Math.sqrt(
						values.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
							(values.length - 1),
					),
		p25: quantile(0.25),
		p75: quantile(0.75),
		min: sorted[0],
		max: sorted.at(-1),
	};
}

async function main() {
	const { values } = parseArgs({
		options: {
			quick: { type: "boolean" },
			runs: { type: "string" },
			warmup: { type: "string" },
			json: { type: "string" },
			scenario: { type: "string", multiple: true },
			help: { type: "boolean" },
		},
	});
	if (values.help) {
		console.log(
			"Usage: benchmark.sh [--quick] [--runs N] [--warmup N] [--json PATH] [--scenario NAME ...]",
		);
		console.log(
			"Scenarios: startup, empty, inventory-stdin, inventory-git, config, matching, noop, real-stdin, real-git",
		);
		return;
	}
	const runs = Number(values.runs ?? (values.quick ? 3 : 10));
	const warmup = Number(values.warmup ?? (values.quick ? 1 : 3));
	if (
		!Number.isInteger(runs) ||
		runs < 1 ||
		!Number.isInteger(warmup) ||
		warmup < 0
	) {
		throw new Error(
			"--runs must be a positive integer; --warmup must be a non-negative integer.",
		);
	}
	const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
	const cwd = resolve(packageRoot, "../..");
	const cli = join(packageRoot, "bin/run.js");
	const binary = join(
		packageRoot,
		"crates/core/target/release",
		platform() === "win32" ? "repopo-core.exe" : "repopo-core",
	);
	await access(join(packageRoot, "esm/commands/check.js"));
	try {
		await access(binary);
	} catch (error) {
		throw new Error(
			"Build the release engine first: cargo build --release --manifest-path packages/repopo/crates/core/Cargo.toml",
			{ cause: error },
		);
	}
	let bunVersion = null;
	try {
		bunVersion = (await measure(["bun", "--version"], cwd)).stdout.trim();
	} catch (error) {
		if (error.code !== "ENOENT") {
			throw error;
		}
		console.log("Bun not found; skipping Bun variants.");
	}
	const inventory = (
		await measure(
			["git", "ls-files", "-co", "-z", "--exclude-standard", "--full-name"],
			cwd,
		)
	).stdout;
	const files = inventory.split("\0").filter(Boolean);
	if (files.some((file) => /[\r\n]/.test(file))) {
		throw new Error(
			"The stdin benchmark cannot represent filenames containing newlines.",
		);
	}
	const snapshot = `${files.join("\n")}\n`;
	const directory = await mkdtemp(join(tmpdir(), "repopo-benchmark-"));
	try {
		const empty = join(directory, "empty.mjs");
		const miss = join(directory, "miss.mjs");
		const noop = join(directory, "noop.mjs");
		await writeFile(empty, "export default { policies: [] };\n");
		for (const [path, pattern] of [
			[miss, "/^$/"],
			[noop, "/./"],
		]) {
			await writeFile(
				path,
				`
import { policy } from ${JSON.stringify(pathToFileURL(join(packageRoot, "esm/makePolicy.js")).href)};
export default { policies: Array.from({ length: 20 }, (_, i) => policy({
	name: "Benchmark" + i,
	description: "Synthetic benchmark policy",
	match: ${pattern},
	handler: async () => true,
})) };
`,
			);
		}
		const scenarios = [
			{ name: "startup", args: null, input: "" },
			{ name: "empty", args: ["--config", empty, "--stdin"], input: "" },
			{
				name: "inventory-stdin",
				args: ["--config", empty, "--stdin"],
				input: snapshot,
			},
			{ name: "inventory-git", args: ["--config", empty], input: "" },
			{ name: "config", args: ["--config", miss, "--stdin"], input: "" },
			{
				name: "matching",
				args: ["--config", miss, "--stdin"],
				input: snapshot,
			},
			{ name: "noop", args: ["--config", noop, "--stdin"], input: snapshot },
			{ name: "real-stdin", args: ["--stdin"], input: snapshot },
			{ name: "real-git", args: [], input: "" },
		];
		for (const name of values.scenario ?? []) {
			if (!scenarios.some((scenario) => scenario.name === name)) {
				throw new Error(`Unknown scenario: ${name}`);
			}
		}
		const engines = [
			{ name: "typescript", prefix: [process.execPath, cli], args: ["check"] },
			...["node", ...(bunVersion ? ["bun"] : [])].flatMap((runtime) => [
				{
					name: `core-${runtime}`,
					prefix: [binary],
					args: [
						"check",
						"--sidecar-path",
						join(packageRoot, "sidecar/sidecar.mjs"),
						"--runtime",
						runtime,
					],
				},
				{
					name: `cli-${runtime}`,
					prefix: [process.execPath, cli],
					args: ["check-native", "--binary-path", binary, "--runtime", runtime],
				},
			]),
		];
		const cases = scenarios
			.filter(
				(scenario) =>
					!values.scenario || values.scenario.includes(scenario.name),
			)
			.flatMap((scenario) =>
				engines.map((engine) => ({
					scenario: scenario.name,
					engine: engine.name,
					command: [
						...engine.prefix,
						...(scenario.args === null
							? ["--help"]
							: [...engine.args, "--quiet", ...scenario.args]),
					],
					input: scenario.input,
				})),
			);
		console.log(
			`${files.length} files; ${cases.length} cases; ${warmup} warmups + ${runs} timed rounds. Any nonzero exit aborts.`,
		);
		const samples = await runRounds(cases, { cwd, runs, warmup });
		const results = cases.map((entry) => ({
			scenario: entry.scenario,
			engine: entry.engine,
			...summarize(
				samples
					.filter(
						(sample) =>
							sample.scenario === entry.scenario &&
							sample.engine === entry.engine,
					)
					.map((sample) => sample.milliseconds),
			),
		}));
		console.table(
			results.map(({ scenario, engine, median, mean, stddev, p25, p75 }) => ({
				scenario,
				engine,
				"median ms": median.toFixed(1),
				"mean ms": mean.toFixed(1),
				"sd ms": stddev.toFixed(1),
				"p25 ms": p25.toFixed(1),
				"p75 ms": p75.toFixed(1),
			})),
		);
		if (values.json) {
			await writeFile(
				resolve(values.json),
				`${JSON.stringify(
					{
						metadata: {
							timestamp: new Date().toISOString(),
							cwd,
							node: process.version,
							bun: bunVersion,
							platform: platform(),
							release: release(),
							arch: arch(),
							cpu: cpus()[0]?.model,
							files: files.length,
							syntheticPolicies: 20,
							runs,
							warmup,
							units: "milliseconds",
						},
						cases,
						samples,
						results,
					},
					null,
					2,
				)}\n`,
			);
		}
	} finally {
		await rm(directory, { recursive: true, force: true });
	}
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	main().catch((error) => {
		console.error(error);
		process.exitCode = 1;
	});
}

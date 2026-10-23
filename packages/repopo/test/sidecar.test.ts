import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runInNewContext } from "node:vm";
import { join } from "pathe";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { DefaultPolicies } from "../src/policy.js";

const sidecarPath = fileURLToPath(
	new URL("../sidecar/sidecar.mjs", import.meta.url),
);

async function runSidecar(requests: object[]): Promise<unknown[]> {
	const stdout = await new Promise<string>((resolve, reject) => {
		const child = execFile(
			process.execPath,
			[sidecarPath],
			{ timeout: 5000 },
			(error, output, stderr) => {
				if (error) {
					reject(new Error(`Sidecar failed: ${stderr}`, { cause: error }));
				} else {
					resolve(output);
				}
			},
		);
		child.stdin?.end(
			`${[...requests, { method: "shutdown" }]
				.map((request) => JSON.stringify(request))
				.join("\n")}\n`,
		);
	});
	return stdout
		.trim()
		.split("\n")
		.map((line): unknown => JSON.parse(line));
}

describe("Native sidecar protocol", () => {
	let testDir: string;
	let configPath: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-sidecar-test-"));
		configPath = join(testDir, "repopo.config.mjs");
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	it.each([
		false,
		true,
	])("bundles public API configs and runs concurrent operations with failure=%s", async (fail) => {
		const apiUrl = new URL("../esm/index.js", import.meta.url).href;
		const shimUrl = new URL(
			"../sidecar/shims/effection-shim.mjs",
			import.meta.url,
		).href;
		await writeFile(
			configPath,
			`import { policy } from ${JSON.stringify(apiUrl)};
				import { all, call } from ${JSON.stringify(shimUrl)};
				export default { policies: [policy({
					name: "Concurrent", description: "Checks concurrent operations", match: /txt$/,
					handler: function* () {
						let release;
						const gate = new Promise(resolve => { release = resolve; });
						const results = yield* all([
							(function* () {
								yield* call(() => gate);
								if (${fail}) throw new Error("Concurrent operation failed");
								return "first";
							})(),
							(function* () { release(); return "second"; })()
						]);
						return results.join(",") === "first,second"
							? true : { error: "Operation results were reordered" };
					}
				})] };`,
		);
		const { stdout } = await promisify(execFile)(
			process.execPath,
			[
				sidecarPath,
				"--mode",
				"bundle",
				"--git-root",
				testDir,
				"--config",
				configPath,
			],
			{ timeout: 10000 },
		);
		const bundle: { bundle: string } = JSON.parse(stdout);
		const globals: {
			__repopo_runHandlerBatchSync?: (
				policyId: number,
				files: string,
				root: string,
				resolve: boolean,
			) => void;
			__repopo_lastResult?: string | null;
		} = {};
		runInNewContext(
			bundle.bundle,
			Object.assign(globals, { process, Buffer, URL }),
			{ timeout: 5000 },
		);
		if (!globals.__repopo_runHandlerBatchSync) {
			throw new Error("QuickJS bundle did not initialize its handler bridge");
		}
		globals.__repopo_runHandlerBatchSync(
			0,
			JSON.stringify(["file.txt"]),
			testDir,
			false,
		);
		await expect
			.poll(() => globals.__repopo_lastResult)
			.toEqual(expect.any(String));
		if (typeof globals.__repopo_lastResult !== "string") {
			throw new Error("QuickJS handler batch did not return a result");
		}
		expect(JSON.parse(globals.__repopo_lastResult)).toEqual(
			fail
				? {
						pass: [],
						fail: [
							{
								file: "file.txt",
								error: "Handler error: Concurrent operation failed",
								fixable: false,
							},
						],
					}
				: { pass: ["file.txt"], fail: [] },
		);
	});

	it("bundles repository policies and preserves exclusion flags for QuickJS", async () => {
		await writeFile(
			configPath,
			`export default {
			excludeFiles: [/^README/, "vendor/"],
			policies: [{
				name: "FilePolicy", description: "Checks files", match: /txt$/,
				excludeFiles: [/^skip$/m],
				handler: async () => true
			}, {
				name: "RepositoryPolicy", description: "Checks the repository", scope: "repository",
				handler: async () => []
			}]
		};`,
		);
		const { stdout } = await promisify(execFile)(
			process.execPath,
			[
				sidecarPath,
				"--mode",
				"bundle",
				"--git-root",
				testDir,
				"--config",
				configPath,
			],
			{ timeout: 10000 },
		);
		const bundle: {
			bundle: string;
			reasons: unknown[];
		} = JSON.parse(stdout);
		const expectedMetadata = {
			excludeFiles: [{ source: "^README", flags: "" }, "vendor/"],
			policies: [
				expect.objectContaining({
					scope: "file",
					excludeFiles: [{ source: "^skip$", flags: "m" }],
				}),
				expect.objectContaining({ scope: "repository" }),
			],
		};
		expect(bundle.reasons).toEqual([]);
		expect(bundle).not.toHaveProperty("policies");
		const globals: Record<string, unknown> = { process, Buffer, URL };
		runInNewContext(bundle.bundle, globals, { timeout: 5000 });
		const metadata = globals.__repopo_metadata;
		if (typeof metadata !== "string") {
			throw new Error("QuickJS bundle did not initialize its metadata");
		}
		expect(JSON.parse(metadata)).toMatchObject(expectedMetadata);
	});

	it("preserves explicit exclusion flags in metadata and repository execution", async () => {
		await simpleGit(testDir).init();
		await writeFile(join(testDir, "readme.md"), "readme");
		await writeFile(join(testDir, "prefix\nskip"), "excluded");
		await writeFile(
			configPath,
			`export default {
			excludeFiles: [/^README/, /^skip$/m, "vendor/"],
			policies: [{
				name: "RepositoryExclusions", description: "Checks exclusions", scope: "repository",
				excludeFiles: [/^OTHER/, /^skip$/m, "vendor/"],
				handler: async ({ files }) => [{ error: JSON.stringify(files) }]
			}]
		};`,
		);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{ method: "run_repository_policies", params: { resolve: false } },
		]);
		expect(responses[0]).toMatchObject({
			ok: true,
			data: {
				excludeFiles: [
					{ source: "^README", flags: "" },
					{ source: "^skip$", flags: "m" },
					"vendor/",
				],
				policies: [
					expect.objectContaining({
						excludeFiles: [
							{ source: "^OTHER", flags: "" },
							{ source: "^skip$", flags: "m" },
							"vendor/",
						],
					}),
				],
			},
		});
		expect(responses[1]).toMatchObject({
			ok: true,
			data: [
				expect.objectContaining({
					outcome: {
						error: JSON.stringify(["readme.md", "repopo.config.mjs"]),
					},
				}),
			],
		});
	});

	it.each([
		true,
		false,
	])("preserves new resolver results with fixed=%s", async (fixed) => {
		await writeFile(
			configPath,
			`export default {
			policies: [{
				name: "Resolver", description: "New-format resolver", match: /./,
				handler: async () => ({ error: "Needs a fix" }),
				resolver: async () => ({ error: "Resolver result", fixed: ${fixed}, manualFix: "Guidance" })
			}]
		};`,
		);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{
				method: "run_resolver",
				params: { policyName: "Resolver", file: "file.txt", root: testDir },
			},
			{
				method: "run_resolver_batch",
				params: { policyId: 0, files: ["file.txt"] },
			},
		]);
		const result = { error: "Resolver result", fixed, manualFix: "Guidance" };
		expect(responses[1]).toEqual({ ok: true, data: result });
		expect(responses[2]).toEqual({
			ok: true,
			data: { pass: [], fail: [{ file: "file.txt", ...result }] },
		});
	});

	it.each([
		1,
		3,
		undefined,
	])("bounds read-only batches with concurrency %s and preserves input order", async (concurrency) => {
		const limit = concurrency ?? 8;
		await writeFile(
			configPath,
			`
			let active = 0, peak = 0, started = 0;
			let release;
			const gate = new Promise(resolve => { release = resolve; });
			export default { policies: [{
				name: "Bounded", description: "Checks a bounded batch", match: /txt$/,
				handler: async ({ file }) => {
					active++; started++;
					peak = Math.max(peak, active);
					if (started === ${limit}) release();
					await gate;
					await Promise.resolve();
					active--;
					return { error: "peak=" + peak };
				}
			}] };`,
		);
		const files = Array.from({ length: 17 }, (_, index) => `${index}.txt`);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{
				method: "run_handler_batch",
				params: { policyId: 0, files, concurrency },
			},
		]);
		expect(responses[1]).toMatchObject({
			ok: true,
			data: {
				pass: [],
				fail: files.map((file) => ({ file, error: `peak=${limit}` })),
			},
		});
	});

	it("keeps fix and resolver batches sequential despite the requested concurrency", async () => {
		await writeFile(
			configPath,
			`
			let active = 0, peak = 0;
			const handler = async () => {
				active++; peak = Math.max(peak, active);
				await Promise.resolve();
				active--;
				return { error: "peak=" + peak, fixed: true };
			};
			export default { policies: [{
				name: "Fix", description: "Sequential fixes", match: /txt$/,
				handler, resolver: handler
			}] };`,
		);
		const files = ["a.txt", "b.txt", "c.txt"];
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{
				method: "run_handler_batch",
				params: { policyId: 0, files, resolve: true, concurrency: 8 },
			},
			{
				method: "run_resolver_batch",
				params: { policyId: 0, files, concurrency: 8 },
			},
		]);
		for (const response of responses.slice(1)) {
			expect(response).toMatchObject({
				ok: true,
				data: {
					fail: files.map((file) => ({ file, error: "peak=1", fixed: true })),
				},
			});
		}
	});

	it("retains input order and per-file errors when handlers fail out of order", async () => {
		await writeFile(
			configPath,
			`
			let release;
			const gate = new Promise(resolve => { release = resolve; });
			export default { policies: [{
				name: "Errors", description: "Reports each file failure", match: /txt$/,
				handler: async ({ file }) => {
					if (file === "a.txt") { await gate; return { error: "Delayed" }; }
					if (file === "b.txt") { release(); throw new Error("Broken"); }
					return null;
				}
			}] };`,
		);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{
				method: "run_handler_batch",
				params: {
					policyId: 0,
					files: ["a.txt", "b.txt", "c.txt"],
					concurrency: 2,
				},
			},
		]);
		expect(responses[1]).toMatchObject({
			ok: true,
			data: {
				fail: [
					{ file: "a.txt", error: "Delayed" },
					{ file: "b.txt", error: "Handler error: Broken" },
					{ file: "c.txt", error: expect.stringContaining("Handler error:") },
				],
			},
		});
	});

	it.each([
		0,
		-1,
		1.5,
		"invalid",
		9007199254740992,
	])("rejects invalid IPC concurrency %s", async (concurrency) => {
		await writeFile(
			configPath,
			`export default { policies: [{
			name: "Policy", description: "Pass", match: /txt$/, handler: async () => true
		}] };`,
		);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{
				method: "run_handler_batch",
				params: { policyId: 0, files: ["a.txt"], concurrency },
			},
		]);
		expect(responses[1]).toMatchObject({
			ok: false,
			error: expect.stringContaining("positive safe integer"),
		});
	});

	it("shares parsing across policy batches, isolates mutations, resets on reload, and bypasses fixes", async () => {
		const helperUrl = new URL(
			"../esm/policyDefiners/definePackagePolicy.js",
			import.meta.url,
		).href;
		const jsonfileUrl = new URL(
			"../node_modules/jsonfile/index.js",
			import.meta.url,
		).href;
		await writeFile(join(testDir, "package.json"), '{"nested":{"value":1}}');
		await writeFile(
			configPath,
			`
			import jsonfile from ${JSON.stringify(jsonfileUrl)};
			let reads = 0;
			const original = jsonfile.readFile;
			jsonfile.readFile = (...args) => { reads++; return original(...args); };
			const { definePackagePolicy } = await import(${JSON.stringify(helperUrl)});
			export default { policies: [0, 1].map(index => ({
				...definePackagePolicy({
					name: "JSON" + index, description: "Reads a cached snapshot",
					handler: async json => {
						const value = json.nested.value;
						json.nested.value = 99;
						return { error: "reads=" + reads + ";value=" + value };
					}
				}),
				config: undefined
			})) };`,
		);
		const batch = (policyId: number, resolve = false) => ({
			method: "run_handler_batch",
			params: { policyId, files: ["package.json"], resolve },
		});
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			batch(0),
			batch(1),
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			batch(1),
			batch(0, true),
			batch(1, true),
		]);
		for (const [index, reads] of [
			[1, 1],
			[2, 1],
			[4, 2],
			[5, 3],
			[6, 4],
		] as const) {
			expect(responses[index]).toMatchObject({
				ok: true,
				data: { fail: [{ error: `reads=${reads};value=1` }] },
			});
		}
	});

	it.each([
		"run_handler_batch",
		"run_resolver_batch",
	])("preserves multiline guidance in %s", async (method) => {
		await writeFile(
			configPath,
			`const fail = async () => ({
				error: "Wrong pattern",
				manualFix: "Use the shared helper.\\nPreserve error handling."
			});
			export default {
				policies: [{
					name: "GuidedPolicy",
					description: "Policy with correction guidance",
					match: /\\.txt$/,
					handler: fail,
					resolver: fail
				}]
			};`,
		);

		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{ method, params: { policyId: 0, files: ["test.txt"], resolve: true } },
		]);

		expect(responses[1]).toMatchObject({
			ok: true,
			data: {
				fail: [
					{
						file: "test.txt",
						error: "Wrong pattern",
						manualFix: "Use the shared helper.\nPreserve error handling.",
					},
				],
			},
		});
	});

	it.each([
		"run_handler_batch",
		"run_resolver_batch",
	])("should preserve legacy fix results in %s", async (method) => {
		await writeFile(
			configPath,
			`const fix = async ({ file }) => ({
					name: "LegacyPolicy",
					file,
					autoFixable: true,
					resolved: true,
					errorMessages: []
				});
				export default {
					policies: [{
						name: "LegacyPolicy",
						description: "Legacy fix result",
						match: /\\.txt$/,
						handler: fix,
						resolver: fix
					}]
				};`,
		);

		const responses = await runSidecar([
			{
				method: "load_config",
				params: { configPath, gitRoot: testDir },
			},
			{
				method,
				params: { policyId: 0, files: ["test.txt"], resolve: true },
			},
		]);

		expect(responses[0]).toMatchObject({ ok: true });
		expect(responses[1]).toEqual({
			ok: true,
			data: {
				pass: [],
				fail: [
					{
						file: "test.txt",
						errorMessages: [],
						fixable: true,
						fixed: true,
					},
				],
			},
		});
	});

	it("runs repository policies once using full Git context and exclusions", async () => {
		await simpleGit(testDir).init();
		await writeFile(join(testDir, "unchanged.txt"), "unchanged");
		await writeFile(join(testDir, "excluded.txt"), "excluded");
		await writeFile(
			configPath,
			`export default {
			excludeFiles: ["excluded"],
			policies: [{
				name: "RepositoryCheck", instanceId: "repo-check",
				description: "Checks repository inventory", scope: "repository",
				handler: async ({ files, resolve }) => [
					{ error: files.includes("unchanged.txt") && !files.includes("excluded.txt") ? "Full context" : "Wrong context", fixed: resolve },
					{ error: "Related files", files: ["unchanged.txt"] }
				]
			}]
		};`,
		);
		const responses = await runSidecar([
			{ method: "load_config", params: { configPath, gitRoot: testDir } },
			{ method: "run_repository_policies", params: { resolve: true } },
		]);
		expect(responses[0]).toMatchObject({
			ok: true,
			data: {
				policies: [
					expect.objectContaining({
						scope: "repository",
						instanceId: "repo-check",
					}),
				],
			},
		});
		expect(responses[1]).toEqual({
			ok: true,
			data: [
				{
					scope: "repository",
					policy: "RepositoryCheck",
					policyId: "repo-check",
					outcome: { error: "Full context", fixed: true },
				},
				{
					scope: "repository",
					policy: "RepositoryCheck",
					policyId: "repo-check",
					outcome: { error: "Related files", files: ["unchanged.txt"] },
				},
			],
		});
	});

	it("should use default policies when a config only specifies exclusions", async () => {
		await writeFile(
			configPath,
			'export default { excludeFiles: ["vendor/"] };',
		);

		const responses = await runSidecar([
			{
				method: "load_config",
				params: { configPath, gitRoot: testDir },
			},
		]);

		expect(responses).toEqual([
			{
				ok: true,
				data: {
					policies: DefaultPolicies.map(({ name }) =>
						expect.objectContaining({ name }),
					),
					excludeFiles: ["vendor/"],
				},
			},
		]);
	});

	it("should keep policies disabled when the config specifies an empty array", async () => {
		await writeFile(
			configPath,
			'export default { policies: [], excludeFiles: ["vendor/"] };',
		);

		const responses = await runSidecar([
			{
				method: "load_config",
				params: { configPath, gitRoot: testDir },
			},
		]);

		expect(responses).toEqual([
			{ ok: true, data: { policies: [], excludeFiles: ["vendor/"] } },
		]);
	});
});

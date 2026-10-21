import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
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

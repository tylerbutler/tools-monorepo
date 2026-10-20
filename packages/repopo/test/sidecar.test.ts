import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
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

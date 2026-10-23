import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { makePolicy, runPolicies } from "repopo/api";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SortTsconfigsPolicy } from "../src/policy.js";

describe("canonical repopo sort policy", () => {
	let root: string;
	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "sort-tsconfig-policy-"));
	});
	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});
	it("checks without configuration using the repository root and leaves files unchanged", async () => {
		const original = '{"compilerOptions":{"strict":true},"include":["src"]}';
		await writeFile(join(root, "tsconfig.json"), original);
		const results = await runPolicies({
			root,
			files: ["tsconfig.json"],
			policies: [makePolicy(SortTsconfigsPolicy)],
		});
		expect(results.errors).toEqual([]);
		expect(results.findings).toMatchObject([
			{ scope: "file", file: "tsconfig.json", fixStatus: "available" },
		]);
		expect(await readFile(join(root, "tsconfig.json"), "utf8")).toBe(original);
	});
	it("reports a fixed finding, persists the sort and passes the next check", async () => {
		await writeFile(
			join(root, "tsconfig.json"),
			'{"compilerOptions":{"strict":true},"include":["src"]}',
		);
		const options = {
			root,
			files: ["tsconfig.json"],
			policies: [makePolicy(SortTsconfigsPolicy)],
		};
		const result = await runPolicies({ ...options, fix: true });
		expect(result.errors).toEqual([]);
		expect(result.findings).toMatchObject([{ fixStatus: "fixed" }]);
		expect((await runPolicies(options)).findings).toEqual([]);
	});
});

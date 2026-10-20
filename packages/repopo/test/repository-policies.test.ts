import { run } from "effection";
import { describe, expect, it } from "vitest";
import config from "../../../repopo.config.js";
import { PolicyRunner } from "../src/runner.js";

describe("Repository architecture policies", () => {
	it("rejects package project.json files with migration guidance but leaves canonical and vendored files alone", async () => {
		const policy = config.policies?.find(
			(candidate) => candidate.name === "NoPackageProjectJson",
		);
		expect(policy).toBeDefined();
		if (!policy) {
			throw new Error("NoPackageProjectJson must be configured");
		}

		const runner = new PolicyRunner({
			policies: [policy],
			excludeFromAll: [],
			excludePoliciesForFiles: new Map(),
			gitRoot: "/repo",
			resolve: true,
		});
		const { results } = await run(() =>
			runner.run([
				"packages/example/project.json",
				"packages/group/example/project.json",
				"packages/example/package.json",
				"packages/example/not-project.json",
				"packages/btree-typescript/project.json",
				"nx.json",
			]),
		);

		expect(results.map(({ file }) => file)).toEqual([
			"packages/example/project.json",
			"packages/group/example/project.json",
		]);
		for (const { outcome } of results) {
			expect(outcome).toMatchObject({
				error: expect.stringContaining("competing locations"),
				manualFix: expect.stringContaining(
					"Preserve required tasks and caching",
				),
			});
			expect(outcome).toHaveProperty(
				"manualFix",
				expect.stringContaining("packages/repopo/package.json and nx.json"),
			);
			expect(outcome).not.toHaveProperty("fixed", true);
		}
	});
});

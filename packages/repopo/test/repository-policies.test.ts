import { describe, expect, it } from "vitest";
import config from "../../../repopo.config.js";
import { runPolicies } from "../src/runner.js";

describe("repository architecture policies", () => {
	it("rejects package project.json files with migration guidance but leaves canonical and vendored files alone", async () => {
		const policy = config.policies?.find(
			(candidate) => candidate.name === "NoPackageProjectJson",
		);
		if (!policy) {
			throw new Error("NoPackageProjectJson must be configured");
		}
		const results = await runPolicies({
			root: "/repo",
			fix: true,
			policies: [policy],
			files: [
				"packages/example/project.json",
				"packages/group/example/project.json",
				"packages/example/package.json",
				"packages/example/not-project.json",
				"packages/btree-typescript/project.json",
				"nx.json",
			],
		});
		expect(results.errors).toEqual([]);
		expect(results.findings.map((finding) => finding.file)).toEqual([
			"packages/example/project.json",
			"packages/group/example/project.json",
		]);
		for (const finding of results.findings) {
			expect(finding).toMatchObject({
				message: expect.stringContaining("competing locations"),
				manualFix: expect.stringContaining(
					"Preserve required tasks and caching",
				),
			});
			expect(finding.manualFix).toContain(
				"packages/repopo/package.json and nx.json",
			);
			expect(finding.fixStatus).not.toBe("fixed");
		}
	});
});

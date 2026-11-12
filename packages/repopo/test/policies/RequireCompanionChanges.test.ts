import { describe, expect, it } from "vitest";
import { makePolicy } from "../../src/makePolicy.js";
import { RequireCompanionChanges } from "../../src/policies/RequireCompanionChanges.js";
import type { RepositoryPolicyDefinition } from "../../src/policy.js";
import type { RepositoryChange } from "../../src/repositoryChanges.js";
import { runPolicies } from "../../src/runner.js";

const policy = makePolicy(RequireCompanionChanges, {
	config: { trigger: /^src\//g, companion: /^docs\//g },
});
function check(entries: RepositoryChange[]) {
	return runPolicies({
		root: "/repo",
		policies: [policy],
		files: [],
		inventory: [],
		changes: { mode: "pr", entries },
	});
}

describe("RequireCompanionChanges", () => {
	it("runs with empty selection/inventory and reports related trigger paths", async () => {
		const result = await check([{ status: "modified", path: "src/a.ts" }]);
		expect(result.errors).toEqual([]);
		expect(result.findings).toMatchObject([
			{
				scope: "repository",
				files: ["src/a.ts"],
				manualFix: expect.stringContaining("companion pattern"),
			},
		]);
		expect((await check([])).findings).toEqual([]);
	});
	it.each([
		"added",
		"modified",
		"type-changed",
	] as const)("accepts a companion %s", async (status) => {
		expect(
			(
				await check([
					{ status: "deleted", path: "src/a.ts" },
					{ status, path: "docs/a.md" },
				])
			).findings,
		).toEqual([]);
	});
	it("does not accept deleting or renaming away a companion", async () => {
		for (const entry of [
			{ status: "deleted", path: "docs/a.md" },
			{ status: "renamed", oldPath: "docs/a.md", path: "archive/a.md" },
		] satisfies RepositoryChange[]) {
			expect(
				(await check([{ status: "modified", path: "src/a.ts" }, entry]))
					.findings,
			).toHaveLength(1);
		}
	});
	it("uses both rename endpoints as triggers and the destination as companion", async () => {
		expect(
			(
				await check([
					{ status: "renamed", oldPath: "src/a.ts", path: "archive/a.ts" },
				])
			).findings,
		).toHaveLength(1);
		expect(
			(
				await check([
					{ status: "renamed", oldPath: "other/a.ts", path: "src/a.ts" },
					{ status: "renamed", oldPath: "draft/a.md", path: "docs/a.md" },
				])
			).findings,
		).toEqual([]);
	});
	it("keeps independent instances and string/RegExp flags", async () => {
		const result = await runPolicies({
			root: "/repo",
			inventory: [],
			changes: {
				mode: "local",
				entries: [{ status: "modified", path: "SRC/a.ts" }],
			},
			policies: [
				makePolicy(RequireCompanionChanges, {
					instanceId: "insensitive",
					config: { trigger: "^src/", companion: "^docs/" },
				}),
				makePolicy(RequireCompanionChanges, {
					instanceId: "sensitive",
					config: { trigger: /^src\//, companion: /^docs\// },
				}),
			],
		});
		expect(result.findings.map((finding) => finding.policyId)).toEqual([
			"insensitive",
		]);
	});
	it("requires an explicit snapshot for programmatic execution", async () => {
		await expect(
			runPolicies({ root: "/repo", inventory: [], policies: [policy] }),
		).rejects.toThrow("requires an explicit changes");
	});
	it("freezes a copy before fixes and preserves raw changes despite inventory exclusions", async () => {
		const entries: RepositoryChange[] = [
			{ status: "modified", path: "src/a.ts" },
		];
		const mutate = {
			name: "Mutate",
			description: "fixture",
			scope: "repository",
			handler: async () => {
				entries.push({ status: "added", path: "docs/a.md" });
				return [];
			},
		} satisfies RepositoryPolicyDefinition;
		const result = await runPolicies({
			root: "/repo",
			inventory: [],
			files: [],
			fix: true,
			exclude: ["^src/"],
			changes: { mode: "local", entries },
			policies: [makePolicy(mutate), policy],
		});
		expect(result.findings).toHaveLength(1);
	});
});

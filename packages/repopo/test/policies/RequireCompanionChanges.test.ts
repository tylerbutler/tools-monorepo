import { describe, expect, it } from "vitest";
import { makePolicy } from "../../src/makePolicy.js";
import { RequireCompanionChanges } from "../../src/policies/RequireCompanionChanges.js";
import type { RepositoryPolicyDefinition } from "../../src/policy.js";
import type { RepositoryFile } from "../../src/repositoryChanges.js";
import { runPolicies } from "../../src/runner.js";

const policy = makePolicy(RequireCompanionChanges, {
	config: { trigger: /^src\//g, companion: /^docs\//g },
});
function check(entries: RepositoryFile[]) {
	return runPolicies({
		root: "/repo",
		policies: [policy],
		files: [],
		inventory: entries,
	});
}

describe("RequireCompanionChanges", () => {
	it("runs with empty selection and reports related trigger paths", async () => {
		const result = await check([{ status: "modified", path: "src/a.ts" }]);
		expect(result.errors).toEqual([]);
		expect(result.findings).toMatchObject([
			{
				scope: "changes",
				files: ["src/a.ts"],
				manualFix: expect.stringContaining("companion pattern"),
			},
		]);
		expect((await check([])).findings).toEqual([]);
	});
	it("does not count unchanged companions or trigger on unchanged sources", async () => {
		expect(
			(
				await check([
					{ status: "modified", path: "src/a.ts" },
					{ status: "unchanged", path: "docs/a.md" },
				])
			).findings,
		).toHaveLength(1);
		expect(
			(await check([{ status: "unchanged", path: "src/a.ts" }])).findings,
		).toEqual([]);
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
			{ status: "renamed", previousPath: "docs/a.md", path: "archive/a.md" },
		] satisfies RepositoryFile[]) {
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
					{ status: "renamed", previousPath: "src/a.ts", path: "archive/a.ts" },
				])
			).findings,
		).toHaveLength(1);
		expect(
			(
				await check([
					{ status: "renamed", previousPath: "other/a.ts", path: "src/a.ts" },
					{ status: "renamed", previousPath: "draft/a.md", path: "docs/a.md" },
				])
			).findings,
		).toEqual([]);
	});
	it("keeps independent instances and string/RegExp flags", async () => {
		const result = await runPolicies({
			root: "/repo",
			inventory: [{ status: "modified", path: "SRC/a.ts" }],
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
	it("requires annotated inventory for programmatic execution", async () => {
		await expect(
			runPolicies({
				root: "/repo",
				inventory: ["src/a.ts"],
				policies: [policy],
			}),
		).rejects.toThrow("require inventory entries with Git statuses");
	});
	it("freezes a copy before fixes while refreshing live inventory", async () => {
		const entries: RepositoryFile[] = [
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
			inventory: async () => entries,
			files: [],
			fix: true,
			policies: [makePolicy(mutate), policy],
		});
		expect(result.findings).toHaveLength(1);
	});
	it("applies inventory exclusions to changed entries", async () => {
		const result = await runPolicies({
			root: "/repo",
			files: [],
			policies: [policy],
			inventory: [{ status: "modified", path: "src/a.ts" }],
			exclude: ["^src/"],
		});
		expect(result.findings).toEqual([]);
	});
	it("provides one full inventory and a live string-path compatibility view", async () => {
		const seen: string[] = [];
		const inventory: RepositoryFile[] = [
			{ status: "unchanged", path: "README.md" },
			{ status: "modified", path: "src/a.ts" },
			{ status: "deleted", path: "docs/old.md" },
			{ status: "added", path: "missing.ts", exists: false },
		];
		const result = await runPolicies({
			root: "/repo",
			inventory,
			policies: [
				makePolicy({
					name: "Read",
					description: "fixture",
					match: /./,
					handler: async ({ file }) => {
						seen.push(file);
						return [];
					},
				}),
				makePolicy({
					name: "Inspect",
					description: "fixture",
					scope: "repository",
					handler: async ({ files, entries }) => {
						expect(files).toEqual(["README.md", "src/a.ts"]);
						expect(entries).toEqual(inventory);
						return [];
					},
				}),
			],
		});
		expect(result.errors).toEqual([]);
		expect(seen).toEqual(["README.md", "src/a.ts"]);
	});
});

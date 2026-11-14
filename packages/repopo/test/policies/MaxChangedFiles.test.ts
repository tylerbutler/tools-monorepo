import { describe, expect, it } from "vitest";
import { makePolicy } from "../../src/makePolicy.js";
import { MaxChangedFiles } from "../../src/policies/MaxChangedFiles.js";
import type { RepositoryPolicyDefinition } from "../../src/policy.js";
import type { RepositoryFile } from "../../src/repositoryChanges.js";
import { runPolicies } from "../../src/runner.js";

function check(maxFiles: number, inventory: RepositoryFile[]) {
	return runPolicies({
		root: "/repo",
		files: [],
		inventory,
		policies: [makePolicy(MaxChangedFiles, { config: { maxFiles } })],
	});
}

describe("MaxChangedFiles", () => {
	it.each([
		1, 2, 3,
	])("checks a two-file change against limit %s", async (limit) => {
		const result = await check(limit, [
			{ status: "added", path: "a.ts" },
			{ status: "modified", path: "b.ts" },
		]);
		expect(result.errors).toEqual([]);
		expect(result.findings).toEqual(
			limit === 1
				? [
						{
							scope: "changes",
							policy: "MaxChangedFiles",
							policyId: "MaxChangedFiles",
							message:
								"Change set contains 2 changed files; maximum allowed is 1.",
							manualFix:
								"Reduce the number of changed files or split the change into smaller change sets.",
						},
					]
				: [],
		);
	});

	it("permits empty changes with a zero limit, but not one changed file", async () => {
		expect((await check(0, [])).findings).toEqual([]);
		expect(
			(await check(0, [{ status: "unchanged", path: "a.ts" }])).findings,
		).toEqual([]);
		expect(
			(await check(0, [{ status: "modified", path: "a.ts" }])).findings,
		).toHaveLength(1);
	});

	it("counts all change statuses and each rename once, ignoring unchanged entries", async () => {
		const inventory: RepositoryFile[] = [
			{ status: "added", path: "added.ts", exists: false },
			{ status: "modified", path: "modified.ts" },
			{ status: "deleted", path: "deleted.ts" },
			{ status: "type-changed", path: "type.ts" },
			{ status: "renamed", previousPath: "old.ts", path: "new.ts" },
			{ status: "unchanged", path: "unchanged.ts" },
		];
		expect((await check(5, inventory)).findings).toEqual([]);
		expect((await check(4, inventory)).findings).toMatchObject([
			{ message: "Change set contains 5 changed files; maximum allowed is 4." },
		]);
	});

	it("honors global and per-instance exclusions independently of file selection", async () => {
		const inventory: RepositoryFile[] = [
			{ status: "modified", path: "src/a.ts" },
			{ status: "added", path: "vendor/b.ts" },
			{ status: "deleted", path: "generated/c.ts" },
			{ status: "renamed", previousPath: "old.ts", path: "generated/d.ts" },
		];
		for (const files of [[], ["vendor/b.ts"]]) {
			const result = await runPolicies({
				root: "/repo",
				files,
				inventory,
				exclude: ["^vendor/"],
				policies: [
					makePolicy(MaxChangedFiles, {
						instanceId: "all-eligible",
						config: { maxFiles: 0 },
					}),
					makePolicy(MaxChangedFiles, {
						instanceId: "without-generated",
						config: { maxFiles: 1 },
						exclude: ["^generated/"],
					}),
				],
			});
			expect(result.errors).toEqual([]);
			expect(result.findings).toMatchObject([
				{
					policyId: "all-eligible",
					message: "Change set contains 3 changed files; maximum allowed is 0.",
				},
			]);
		}
	});

	it.each([
		-1,
		0.5,
		Number.NaN,
		Number.POSITIVE_INFINITY,
		Number.NEGATIVE_INFINITY,
	])("reports invalid limit %s as an execution error", async (limit) => {
		const result = await check(limit, []);
		expect(result.findings).toEqual([]);
		expect(result.errors).toMatchObject([
			{
				scope: "changes",
				policyId: "MaxChangedFiles",
				message:
					"MaxChangedFiles requires maxFiles to be a nonnegative integer.",
			},
		]);
	});

	it("rejects missing configuration and invalid untyped values", async () => {
		expect(() => {
			// @ts-expect-error Required config cannot be omitted.
			makePolicy(MaxChangedFiles);
		}).toThrow("requires config");
		for (const config of [null, {}, { maxFiles: "2" }, { maxFiles: true }]) {
			const result = await runPolicies({
				root: "/repo",
				inventory: [],
				policies: [
					// @ts-expect-error Exercise invalid values from untyped config.
					makePolicy(MaxChangedFiles, { config }),
				],
			});
			expect(result.findings).toEqual([]);
			expect(result.errors).toMatchObject([
				{
					message:
						"MaxChangedFiles requires maxFiles to be a nonnegative integer.",
				},
			]);
		}
	});

	it("counts the pre-fix snapshot rather than changes introduced by a fixer", async () => {
		const inventory: RepositoryFile[] = [{ status: "modified", path: "a.ts" }];
		const fixer = {
			name: "Fixer",
			description: "fixture",
			scope: "repository",
			handler: async () => {
				inventory.push({ status: "added", path: "b.ts" });
				return [];
			},
		} satisfies RepositoryPolicyDefinition;
		const result = await runPolicies({
			root: "/repo",
			files: [],
			fix: true,
			inventory: async () => inventory,
			policies: [
				makePolicy(fixer),
				makePolicy(MaxChangedFiles, { config: { maxFiles: 1 } }),
			],
		});
		expect(result.errors).toEqual([]);
		expect(result.findings).toEqual([]);
	});
});

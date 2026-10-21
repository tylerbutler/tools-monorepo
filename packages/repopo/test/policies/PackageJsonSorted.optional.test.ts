import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PolicyFailure } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("PackageJsonSorted optional dependency", () => {
	afterEach(() => {
		vi.doUnmock("sort-package-json");
		vi.resetModules();
	});

	it("loads repopo without sort-package-json and reports an actionable policy error", async () => {
		vi.doMock("sort-package-json", () => {
			throw Object.assign(
				new Error("Cannot find package 'sort-package-json'"),
				{
					code: "ERR_MODULE_NOT_FOUND",
				},
			);
		});

		await expect(import("../../src/index.js")).resolves.toBeDefined();

		const { PackageJsonSorted } = await import(
			"../../src/policies/PackageJsonSorted.js"
		);
		const testDir = await mkdtemp(join(tmpdir(), "repopo-sorted-optional-"));

		try {
			await writeFile(
				join(testDir, "package.json"),
				JSON.stringify({ version: "1.0.0", name: "test-package" }, null, 2),
			);

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: "package.json",
				root: testDir,
				resolve: false,
				config: undefined,
			})) as PolicyFailure;

			expect(result.name).toBe("PackageJsonSorted");
			expect(result.autoFixable).toBe(false);
			expect(result.errorMessages).toEqual([
				"PackageJsonSorted requires the optional peer dependency sort-package-json. Install it to enable this policy.",
			]);
		} finally {
			await rm(testDir, { recursive: true, force: true });
		}
	});
});

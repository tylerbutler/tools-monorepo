import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	MutuallyExclusiveScripts,
	type MutuallyExclusiveScriptsConfig,
} from "../../src/policies/MutuallyExclusiveScripts.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("MutuallyExclusiveScripts policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const createPackageJson = (json: PackageJson): string => {
		const filePath = join(tempDir, "package.json");
		writeFileSync(filePath, JSON.stringify(json, null, 2));
		return filePath;
	};

	const createArgs = (
		filePath: string,
		config?: MutuallyExclusiveScriptsConfig,
		resolve = false,
	): PolicyArgs<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve,
		config,
	});

	describe("when config is undefined", () => {
		it("should pass validation", async () => {
			const json: PackageJson = { name: "test-package", version: "1.0.0" };
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("when config has empty groups", () => {
		it("should pass validation", async () => {
			const json: PackageJson = { name: "test-package", version: "1.0.0" };
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, { groups: [] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("mutually exclusive validation", () => {
		it("should pass when no scripts from a group are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, {
					groups: [["lint:eslint", "lint:biome"]],
				}),
			);
			expect(result).toBe(true);
		});

		it("should pass when exactly one script from a group is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { "lint:biome": "biome lint ." },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, {
					groups: [["lint:eslint", "lint:biome"]],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when multiple scripts from a group are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"lint:eslint": "eslint .",
					"lint:biome": "biome lint .",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, {
					groups: [["lint:eslint", "lint:biome"]],
				}),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("autoFixable", false);
				expect(result).toHaveProperty("errorMessages");
			}
		});

		it("should validate multiple groups independently", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"lint:biome": "biome lint .",
					"test:jest": "jest",
					"test:vitest": "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, {
					groups: [
						["lint:eslint", "lint:biome"],
						["test:jest", "test:vitest"],
					],
				}),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean" && "errorMessages" in result) {
				// Only the test group should fail
				expect(result.errorMessages.length).toBe(1);
			}
		});

		it("should pass when multiple groups all have at most one member", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"lint:biome": "biome lint .",
					"test:vitest": "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, {
					groups: [
						["lint:eslint", "lint:biome"],
						["test:jest", "test:vitest"],
					],
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("package.json without scripts", () => {
		it("should pass when package.json has no scripts section", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				MutuallyExclusiveScripts.handler,
				createArgs(filePath, {
					groups: [["lint:eslint", "lint:biome"]],
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(MutuallyExclusiveScripts.name).toBe("MutuallyExclusiveScripts");
		});

		it("should have a description", () => {
			expect(MutuallyExclusiveScripts.description).toBeDefined();
		});

		it("should match package.json files", () => {
			expect(MutuallyExclusiveScripts.match.test("package.json")).toBe(true);
		});
	});
});

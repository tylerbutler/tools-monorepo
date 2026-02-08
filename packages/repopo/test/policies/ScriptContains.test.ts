import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ScriptContains,
	type ScriptContainsConfig,
} from "../../src/policies/ScriptContains.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("ScriptContains policy", () => {
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
		config?: ScriptContainsConfig,
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
				ScriptContains.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("when config has empty rules", () => {
		it("should pass validation", async () => {
			const json: PackageJson = { name: "test-package", version: "1.0.0" };
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ScriptContains.handler,
				createArgs(filePath, { rules: [] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("substring validation", () => {
		it("should pass when script contains all required substrings", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { clean: "rimraf dist esm" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ScriptContains.handler,
				createArgs(filePath, {
					rules: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);
			expect(result).toBe(true);
		});

		it("should pass when script contains multiple required substrings", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { test: "vitest run --coverage" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ScriptContains.handler,
				createArgs(filePath, {
					rules: [{ script: "test", mustContain: ["vitest", "run"] }],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when script is missing a required substring", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { clean: "rm -rf dist" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ScriptContains.handler,
				createArgs(filePath, {
					rules: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("autoFixable", false);
				expect(result).toHaveProperty("errorMessages");
			}
		});

		it("should fail when script is missing some required substrings", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { test: "vitest" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ScriptContains.handler,
				createArgs(filePath, {
					rules: [
						{
							script: "test",
							mustContain: ["vitest", "run", "--coverage"],
						},
					],
				}),
			);
			expect(result).not.toBe(true);
		});

		it("should skip validation for scripts that don't exist", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ScriptContains.handler,
				createArgs(filePath, {
					rules: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);
			expect(result).toBe(true);
		});

		it("should validate multiple rules independently", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist",
					build: "echo build",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ScriptContains.handler,
				createArgs(filePath, {
					rules: [
						{ script: "clean", mustContain: ["rimraf"] },
						{ script: "build", mustContain: ["tsc"] },
					],
				}),
			);
			// clean passes, build fails (doesn't contain "tsc")
			expect(result).not.toBe(true);
			if (typeof result !== "boolean" && "errorMessages" in result) {
				expect(result.errorMessages.length).toBe(1);
			}
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
				ScriptContains.handler,
				createArgs(filePath, {
					rules: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(ScriptContains.name).toBe("ScriptContains");
		});

		it("should have a description", () => {
			expect(ScriptContains.description).toBeDefined();
		});

		it("should match package.json files", () => {
			expect(ScriptContains.match.test("package.json")).toBe(true);
		});
	});
});

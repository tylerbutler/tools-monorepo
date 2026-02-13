import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	RequiredScripts,
	type RequiredScriptsConfig,
} from "../../src/policies/RequiredScripts.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("RequiredScripts policy", () => {
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
		config?: RequiredScriptsConfig,
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
				RequiredScripts.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("when config has empty scripts array", () => {
		it("should pass validation", async () => {
			const json: PackageJson = { name: "test-package", version: "1.0.0" };
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, { scripts: [] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("string entries (no default value)", () => {
		it("should pass when all required scripts are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc", test: "vitest" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, { scripts: ["build", "test"] }),
			);
			expect(result).toBe(true);
		});

		it("should fail when required scripts are missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, { scripts: ["build", "test", "lint"] }),
			);
			expect(result).not.toBe(true);
			expect(result).toHaveProperty("errorMessages");
		});

		it("should not be auto-fixable for string-only entries", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, { scripts: ["test"] }),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("autoFixable", false);
			}
		});
	});

	describe("object entries (with default value)", () => {
		it("should pass when scripts with defaults are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { lint: "existing lint command" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, { scripts: [{ lint: "biome lint ." }] }),
			);
			expect(result).toBe(true);
		});

		it("should fail when scripts with defaults are missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, {
					scripts: [{ lint: "biome lint ." }],
				}),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("autoFixable", true);
			}
		});
	});

	describe("mixed entries", () => {
		it("should handle mix of string and object entries", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, {
					scripts: ["build", "test", { lint: "biome lint ." }],
				}),
			);
			expect(result).not.toBe(true);
		});
	});

	describe("auto-fix (resolve)", () => {
		it("should add missing scripts with defaults when resolve=true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(
					filePath,
					{
						scripts: [{ lint: "biome lint ." }, { clean: "rimraf dist" }],
					},
					true,
				),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("resolved", true);
			}

			// Verify file was updated
			const updated = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updated.scripts.lint).toBe("biome lint .");
			expect(updated.scripts.clean).toBe("rimraf dist");
			expect(updated.scripts.build).toBe("tsc");
		});

		it("should report partially resolved when some scripts lack defaults", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(
					filePath,
					{
						scripts: ["test", { lint: "biome lint ." }],
					},
					true,
				),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("resolved", false);
			}
		});
	});

	describe("package.json without scripts", () => {
		it("should fail when package.json has no scripts section", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				RequiredScripts.handler,
				createArgs(filePath, { scripts: ["build"] }),
			);
			expect(result).not.toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(RequiredScripts.name).toBe("RequiredScripts");
		});

		it("should have a description", () => {
			expect(RequiredScripts.description).toBeDefined();
			expect(typeof RequiredScripts.description).toBe("string");
		});

		it("should match package.json files", () => {
			expect(RequiredScripts.match.test("package.json")).toBe(true);
			expect(RequiredScripts.match.test("packages/foo/package.json")).toBe(
				true,
			);
		});
	});
});

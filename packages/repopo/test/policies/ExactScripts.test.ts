import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ExactScripts,
	type ExactScriptsConfig,
} from "../../src/policies/ExactScripts.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("ExactScripts policy", () => {
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
		config?: ExactScriptsConfig,
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
				ExactScripts.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("when config has empty scripts", () => {
		it("should pass validation", async () => {
			const json: PackageJson = { name: "test-package", version: "1.0.0" };
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, { scripts: {} }),
			);
			expect(result).toBe(true);
		});
	});

	describe("exact match validation", () => {
		it("should pass when scripts match exactly", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist esm",
					format: "biome format --write .",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, {
					scripts: {
						clean: "rimraf dist esm",
						format: "biome format --write .",
					},
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when script content differs", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { clean: "rimraf dist" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, {
					scripts: { clean: "rimraf dist esm" },
				}),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("autoFixable", true);
				expect(result).toHaveProperty("errorMessages");
			}
		});

		it("should fail when scripts are missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, {
					scripts: { clean: "rimraf dist" },
				}),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("autoFixable", true);
			}
		});

		it("should report both missing and mismatched scripts", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { clean: "wrong command" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, {
					scripts: {
						clean: "rimraf dist",
						format: "biome format .",
					},
				}),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean" && "errorMessages" in result) {
				expect(result.errorMessages.length).toBe(2);
			}
		});
	});

	describe("auto-fix (resolve)", () => {
		it("should fix missing scripts when resolve=true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, { scripts: { clean: "rimraf dist" } }, true),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("resolved", true);
			}

			const updated = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updated.scripts.clean).toBe("rimraf dist");
			expect(updated.scripts.build).toBe("tsc");
		});

		it("should fix mismatched scripts when resolve=true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { clean: "wrong command" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, { scripts: { clean: "rimraf dist" } }, true),
			);
			expect(result).not.toBe(true);
			if (typeof result !== "boolean") {
				expect(result).toHaveProperty("resolved", true);
			}

			const updated = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updated.scripts.clean).toBe("rimraf dist");
		});
	});

	describe("package.json without scripts", () => {
		it("should fail when scripts section is missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ExactScripts.handler,
				createArgs(filePath, {
					scripts: { build: "tsc" },
				}),
			);
			expect(result).not.toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(ExactScripts.name).toBe("ExactScripts");
		});

		it("should have a description", () => {
			expect(ExactScripts.description).toBeDefined();
		});

		it("should match package.json files", () => {
			expect(ExactScripts.match.test("package.json")).toBe(true);
		});
	});
});

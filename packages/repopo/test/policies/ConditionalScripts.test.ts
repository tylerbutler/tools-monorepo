import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	ConditionalScripts,
	type ConditionalScriptsConfig,
} from "../../src/policies/ConditionalScripts.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("ConditionalScripts policy", () => {
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
		config?: ConditionalScriptsConfig,
		resolve = false,
	): PolicyArgs<typeof config> => ({
		file: relative(tempDir, filePath),
		root: tempDir,
		resolve,
		config,
	});

	describe("when config is undefined", () => {
		it("should pass validation", async () => {
			const json: PackageJson = { name: "test-package", version: "1.0.0" };
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toEqual([]);
		});
	});

	describe("when config has empty rules", () => {
		it("should pass validation", async () => {
			const json: PackageJson = { name: "test-package", version: "1.0.0" };
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(filePath, { rules: [] }),
			);
			expect(result).toEqual([]);
		});
	});

	describe("conditional validation", () => {
		it("retains fixed scripts alongside remaining conditional requirements", async () => {
			const filePath = createPackageJson({
				name: "test-package",
				scripts: { build: "tsc" },
			});
			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(
					filePath,
					{
						rules: [
							{
								ifPresent: "build",
								requires: [{ clean: "rimraf dist" }, "test"],
							},
						],
					},
					true,
				),
			);
			expect(
				result.some(
					(finding) =>
						finding.fixStatus === "fixed" && finding.message.includes("clean"),
				),
			).toBe(true);
			expect(
				result.some(
					(finding) =>
						finding.fixStatus !== "fixed" && finding.message.includes("test"),
				),
			).toBe(true);
			expect(JSON.parse(readFileSync(filePath, "utf8")).scripts.clean).toBe(
				"rimraf dist",
			);
		});

		it("should pass when trigger script is absent", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { test: "vitest" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(filePath, {
					rules: [{ ifPresent: "build", requires: ["clean"] }],
				}),
			);
			expect(result).toEqual([]);
		});

		it("should pass when trigger and required scripts are all present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(filePath, {
					rules: [{ ifPresent: "build", requires: ["clean"] }],
				}),
			);
			expect(result).toEqual([]);
		});

		it("should fail when trigger is present but required scripts are missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(filePath, {
					rules: [{ ifPresent: "build", requires: ["clean"] }],
				}),
			);
			expect(result).not.toEqual([]);
			if (typeof result !== "boolean") {
				expect(result.length).toBeGreaterThan(0);
			}
		});

		it("should handle multiple rules independently", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rimraf dist",
					test: "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(filePath, {
					rules: [
						{ ifPresent: "build", requires: ["clean"] },
						{ ifPresent: "test", requires: ["test:coverage"] },
					],
				}),
			);
			// First rule passes (clean present), second fails (test:coverage missing)
			expect(result).not.toEqual([]);
		});

		it("should handle object entries in requires", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(filePath, {
					rules: [
						{
							ifPresent: "build",
							requires: [{ clean: "rimraf dist" }],
						},
					],
				}),
			);
			expect(result).not.toEqual([]);
			if (typeof result !== "boolean") {
				expect(
					result.some((finding) => finding.fixStatus !== undefined),
				).toEqual(true);
			}
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
				ConditionalScripts.handler,
				createArgs(
					filePath,
					{
						rules: [
							{
								ifPresent: "build",
								requires: [{ clean: "rimraf dist" }],
							},
						],
					},
					true,
				),
			);
			expect(result).not.toEqual([]);
			if (typeof result !== "boolean") {
				expect(
					result.length > 0 &&
						result.every((finding) => finding.fixStatus === "fixed"),
				).toEqual(true);
			}

			const updated = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updated.scripts.clean).toBe("rimraf dist");
			expect(updated.scripts.build).toBe("tsc");
		});

		it("should not auto-fix when required scripts have no defaults", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { build: "tsc" },
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				ConditionalScripts.handler,
				createArgs(
					filePath,
					{
						rules: [{ ifPresent: "build", requires: ["clean"] }],
					},
					true,
				),
			);
			expect(result).not.toEqual([]);
			if (typeof result !== "boolean") {
				expect(
					result.some((finding) => finding.fixStatus !== undefined),
				).toEqual(false);
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
				ConditionalScripts.handler,
				createArgs(filePath, {
					rules: [{ ifPresent: "build", requires: ["clean"] }],
				}),
			);
			expect(result).toEqual([]);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(ConditionalScripts.name).toBe("ConditionalScripts");
		});

		it("should have a description", () => {
			expect(ConditionalScripts.description).toBeDefined();
		});

		it("should match package.json files", () => {
			expect(ConditionalScripts.match.test("package.json")).toBe(true);
		});
	});
});

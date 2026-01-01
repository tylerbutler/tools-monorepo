import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageCleanScript,
	type PackageCleanScriptConfig,
} from "../../src/policies/PackageCleanScript.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("PackageCleanScript policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-clean-script-test-"));
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
		config?: PackageCleanScriptConfig,
	): PolicyFunctionArguments<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve: false,
		config,
	});

	describe("when config is undefined", () => {
		it("should skip validation", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("requireCleanScript", () => {
		it("should fail when clean script is missing and required", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requireCleanScript: true }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("missing");
				expect(result.errorMessage).toContain("clean");
			}
		});

		it("should pass when clean script is missing and not required", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requireCleanScript: false }),
			);
			expect(result).toBe(true);
		});

		it("should pass when clean script exists and is required", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requireCleanScript: true }),
			);
			expect(result).toBe(true);
		});
	});

	describe("requiredCleanDirs", () => {
		it("should pass when all required directories are in clean script", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist esm lib",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requiredCleanDirs: ["dist", "esm", "lib"] }),
			);
			expect(result).toBe(true);
		});

		it("should fail when some required directories are missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requiredCleanDirs: ["dist", "esm", "lib"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("esm");
				expect(result.errorMessage).toContain("lib");
			}
		});

		it("should match directories as substrings", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf ./dist ./esm",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requiredCleanDirs: ["dist", "esm"] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("requiredPatterns", () => {
		it("should pass when at least one required pattern is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requiredPatterns: ["rimraf", "rm -rf"] }),
			);
			expect(result).toBe(true);
		});

		it("should pass with rm -rf pattern", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist esm",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requiredPatterns: ["rimraf", "rm -rf"] }),
			);
			expect(result).toBe(true);
		});

		it("should fail when no required pattern is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "del-cli dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requiredPatterns: ["rimraf", "rm -rf"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("rimraf");
				expect(result.errorMessage).toContain("rm -rf");
			}
		});
	});

	describe("combined configuration", () => {
		const fullConfig: PackageCleanScriptConfig = {
			requireCleanScript: true,
			requiredCleanDirs: ["dist", "esm"],
			requiredPatterns: ["rimraf"],
		};

		it("should pass when all requirements are met", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist esm .coverage",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, fullConfig),
			);
			expect(result).toBe(true);
		});

		it("should fail when script is missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, fullConfig),
			);

			expect(result).not.toBe(true);
		});

		it("should fail when directories are missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, fullConfig),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("excludePackages", () => {
		it("should skip validation for excluded packages", async () => {
			const json: PackageJson = {
				name: "@myorg/excluded",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, {
					requireCleanScript: true,
					excludePackages: ["@myorg/excluded"],
				}),
			);
			expect(result).toBe(true);
		});

		it("should skip packages matching scope exclusion", async () => {
			const json: PackageJson = {
				name: "@legacy/old-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, {
					requireCleanScript: true,
					excludePackages: ["@legacy"],
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("special cases", () => {
		it("should skip root package", async () => {
			const json: PackageJson = {
				name: "root",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requireCleanScript: true }),
			);
			expect(result).toBe(true);
		});

		it("should skip packages without a name", async () => {
			const json: PackageJson = {
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requireCleanScript: true }),
			);
			expect(result).toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageCleanScript.name).toBe("PackageCleanScript");
		});

		it("should mark failures as not auto-fixable", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageCleanScript.handler(
				createArgs(filePath, { requireCleanScript: true }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
			}
		});
	});
});

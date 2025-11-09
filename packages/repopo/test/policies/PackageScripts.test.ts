import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PackageScripts } from "../../src/policies/PackageScripts.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("PackageScripts policy", () => {
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
		config?: { must?: string[]; mutuallyExclusive?: string[][] },
	): PolicyFunctionArguments<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve: false,
		config,
	});

	describe("when config is undefined", () => {
		it("should pass validation", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("'must' validation", () => {
		it("should pass when all required scripts are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rm -rf dist",
					test: "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { must: ["build", "clean"] }),
			);
			expect(result).toBe(true);
		});

		it("should fail when required scripts are missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { must: ["build", "clean", "test"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("Missing required scripts");
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("test");
				expect(result.errorMessage).not.toContain("build");
			}
		});

		it("should fail when package has no scripts field", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { must: ["build"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("Missing required scripts");
				expect(result.errorMessage).toContain("build");
			}
		});

		it("should pass when must array is empty", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { must: [] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("'mutuallyExclusive' validation", () => {
		it("should pass when zero scripts from the group are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					mutuallyExclusive: [["test:unit", "test:vitest"]],
				}),
			);
			expect(result).toBe(true);
		});

		it("should pass when exactly one script from the group is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"test:unit": "vitest run",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					mutuallyExclusive: [["test:unit", "test:vitest"]],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when multiple scripts from the same group are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"test:unit": "vitest run",
					"test:vitest": "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					mutuallyExclusive: [["test:unit", "test:vitest"]],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("mutually exclusive");
				expect(result.errorMessage).toContain("test:unit");
				expect(result.errorMessage).toContain("test:vitest");
			}
		});

		it("should validate multiple mutually exclusive groups independently", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"build:tsc": "tsc",
					"test:unit": "vitest",
					"lint:eslint": "eslint",
					"lint:biome": "biome",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					mutuallyExclusive: [
						["build:tsc", "build:swc"],
						["test:unit", "test:vitest"],
						["lint:eslint", "lint:biome"],
					],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				// Should fail for lint group only
				expect(result.errorMessage).toContain("lint:eslint");
				expect(result.errorMessage).toContain("lint:biome");
				// Should not mention the valid groups
				expect(result.errorMessage).not.toContain("build:tsc");
				expect(result.errorMessage).not.toContain("test:unit");
			}
		});

		it("should pass when mutuallyExclusive array is empty", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { mutuallyExclusive: [] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("combined 'must' and 'mutuallyExclusive' validation", () => {
		it("should pass when all required scripts are present and no mutual exclusions are violated", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rm -rf dist",
					"test:unit": "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					must: ["build", "clean"],
					mutuallyExclusive: [["test:unit", "test:vitest"]],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail with both types of errors", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					"test:unit": "vitest",
					"test:vitest": "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					must: ["build", "clean"],
					mutuallyExclusive: [["test:unit", "test:vitest"]],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("Missing required scripts");
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("mutually exclusive");
				expect(result.errorMessage).toContain("test:unit");
			}
		});
	});

	describe("edge cases", () => {
		it("should handle empty scripts object", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { must: ["build"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("Missing required scripts");
			}
		});

		it("should not be auto-fixable", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { must: ["build"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
			}
		});

		it("should handle config with only must", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, { must: ["build"] }),
			);
			expect(result).toBe(true);
		});

		it("should handle config with only mutuallyExclusive", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"test:unit": "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					mutuallyExclusive: [["test:unit", "test:vitest"]],
				}),
			);
			expect(result).toBe(true);
		});

		it("should handle three mutually exclusive scripts where two are present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					"format:prettier": "prettier",
					"format:biome": "biome",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					mutuallyExclusive: [
						["format:prettier", "format:biome", "format:dprint"],
					],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("mutually exclusive");
				expect(result.errorMessage).toContain("2");
			}
		});
	});
});

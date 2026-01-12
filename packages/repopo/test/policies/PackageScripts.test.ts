import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageScripts,
	type PackageScriptsSettings,
} from "../../src/policies/PackageScripts.js";
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
		config?: PackageScriptsSettings,
		resolve = false,
	): PolicyFunctionArguments<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve,
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
				expect(result.errorMessages?.[0]).toContain("Missing required scripts");
				expect(result.errorMessages?.[0]).toContain("clean");
				expect(result.errorMessages?.[0]).toContain("test");
				expect(result.errorMessages?.[0]).not.toContain("build");
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
				expect(result.errorMessages?.[0]).toContain("Missing required scripts");
				expect(result.errorMessages?.[0]).toContain("build");
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
				expect(result.errorMessages?.[0]).toContain("mutually exclusive");
				expect(result.errorMessages?.[0]).toContain("test:unit");
				expect(result.errorMessages?.[0]).toContain("test:vitest");
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
				expect(result.errorMessages?.[0]).toContain("lint:eslint");
				expect(result.errorMessages?.[0]).toContain("lint:biome");
				// Should not mention the valid groups
				expect(result.errorMessages?.[0]).not.toContain("build:tsc");
				expect(result.errorMessages?.[0]).not.toContain("test:unit");
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
				const allErrors = result.errorMessages?.join(" ") ?? "";
				expect(allErrors).toContain("Missing required scripts");
				expect(allErrors).toContain("clean");
				expect(allErrors).toContain("mutually exclusive");
				expect(allErrors).toContain("test:unit");
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
				expect(result.errorMessages?.[0]).toContain("Missing required scripts");
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
				expect(result.errorMessages?.[0]).toContain("mutually exclusive");
				expect(result.errorMessages?.[0]).toContain("2");
			}
		});
	});

	describe("'conditionalRequired' validation", () => {
		it("should pass when triggering script is not present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					conditionalRequired: [{ ifPresent: "build", requires: ["clean"] }],
				}),
			);
			expect(result).toBe(true);
		});

		it("should pass when triggering script exists and required scripts exist", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					conditionalRequired: [{ ifPresent: "build", requires: ["clean"] }],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when triggering script exists but required scripts are missing", async () => {
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
					conditionalRequired: [{ ifPresent: "build", requires: ["clean"] }],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("build");
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("missing");
			}
		});

		it("should handle multiple required scripts", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					conditionalRequired: [
						{ ifPresent: "build", requires: ["clean", "lint"] },
					],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("lint");
				expect(result.errorMessage).not.toContain("clean");
			}
		});

		it("should handle multiple conditional rules", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					test: "vitest",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					conditionalRequired: [
						{ ifPresent: "build", requires: ["clean"] },
						{ ifPresent: "test", requires: ["test:coverage"] },
					],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("test:coverage");
			}
		});

		it("should accept inline defaults in requires", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rimraf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					conditionalRequired: [
						{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
					],
				}),
			);
			expect(result).toBe(true);
		});

		it("should mark missing scripts as autoFixable when inline defaults exist in requires", async () => {
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
					conditionalRequired: [
						{ ifPresent: "build", requires: [{ clean: "rimraf dist" }] },
					],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(true);
				expect(result.errorMessage).toContain("clean");
			}
		});

		it("should auto-fix missing conditionalRequired scripts with inline defaults", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						conditionalRequired: [
							{ ifPresent: "build", requires: [{ clean: "rimraf dist esm" }] },
						],
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify the file was updated
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist esm");
			expect(updatedContent.scripts.build).toBe("tsc");
		});

		it("should handle mixed string and object entries in requires", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						conditionalRequired: [
							{
								ifPresent: "build",
								requires: ["test", { clean: "rimraf dist" }],
							},
						],
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				// Partially resolved - clean was added but test has no default
				expect(result.resolved).toBe(false);
				expect(result.errorMessage).toContain("test");
			}

			// Verify clean was added
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist");
		});
	});

	describe("'scriptMustContain' validation", () => {
		it("should pass when script contains required substring", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf --glob dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					scriptMustContain: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);
			expect(result).toBe(true);
		});

		it("should pass when script contains all required substrings", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf --glob dist esm",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					scriptMustContain: [
						{ script: "clean", mustContain: ["rimraf", "dist"] },
					],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when script is missing required substring", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					scriptMustContain: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("rimraf");
			}
		});

		it("should fail listing all missing substrings", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					scriptMustContain: [
						{ script: "clean", mustContain: ["rimraf", "--glob"] },
					],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("rimraf");
				expect(result.errorMessage).toContain("--glob");
			}
		});

		it("should skip validation when script does not exist", async () => {
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
					scriptMustContain: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);
			expect(result).toBe(true);
		});

		it("should handle multiple scripts with content rules", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist",
					build: "swc src",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					scriptMustContain: [
						{ script: "clean", mustContain: ["rimraf"] },
						{ script: "build", mustContain: ["tsc"] },
					],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("rimraf");
				expect(result.errorMessage).toContain("build");
				expect(result.errorMessage).toContain("tsc");
			}
		});
	});

	describe("combined new validations", () => {
		it("should validate all rule types together", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rm -rf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					must: ["build"],
					conditionalRequired: [{ ifPresent: "build", requires: ["test"] }],
					scriptMustContain: [{ script: "clean", mustContain: ["rimraf"] }],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				// conditionalRequired error
				expect(result.errorMessage).toContain("test");
				// scriptMustContain error
				expect(result.errorMessage).toContain("rimraf");
			}
		});
	});

	describe("'must' with inline defaults validation and auto-fix", () => {
		it("should not validate existing scripts against inline defaults", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist", // Different from default
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					must: [{ clean: "rimraf dist esm" }],
				}),
			);

			// Should pass because existing scripts are not validated against defaults in 'must'
			expect(result).toBe(true);
		});

		it("should mark missing required scripts as autoFixable when inline defaults exist", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					must: [{ clean: "rimraf dist" }],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(true);
				expect(result.errorMessage).toContain("Missing required scripts");
				expect(result.errorMessage).toContain("clean");
			}
		});

		it("should not mark as autoFixable when no default exists for missing script", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					must: ["clean"], // No default, just string
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
			}
		});

		it("should auto-fix missing required scripts when resolve is true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						must: ["build", { clean: "rimraf dist esm" }],
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
				expect(result.errorMessage).toContain("Fixed scripts");
				expect(result.errorMessage).toContain("clean");
			}

			// Verify the file was updated
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist esm");
			expect(updatedContent.scripts.build).toBe("tsc");
		});

		it("should auto-fix missing conditionalRequired scripts when defaults exist in must", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						must: [{ clean: "rimraf dist" }],
						conditionalRequired: [{ ifPresent: "build", requires: ["clean"] }],
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify the file was updated
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist");
		});

		it("should report remaining errors after partial auto-fix", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						must: [{ clean: "rimraf dist" }, "test"], // clean has default, test doesn't
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(false);
				expect(result.errorMessage).toContain("Fixed scripts");
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("Remaining errors");
				expect(result.errorMessage).toContain("test");
			}

			// Verify clean was added
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist");
		});

		it("should not modify file when resolve is false", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);
			const originalContent = readFileSync(filePath, "utf-8");

			await PackageScripts.handler(
				createArgs(
					filePath,
					{
						must: [{ clean: "rimraf dist" }],
					},
					false,
				),
			);

			// Verify file was not modified
			const currentContent = readFileSync(filePath, "utf-8");
			expect(currentContent).toBe(originalContent);
		});

		it("should auto-fix multiple missing scripts with inline defaults", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						must: [
							{ clean: "rimraf dist" },
							{ format: "biome format --write ." },
							{ lint: "biome lint ." },
						],
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("format");
				expect(result.errorMessage).toContain("lint");
			}

			// Verify all scripts were added
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist");
			expect(updatedContent.scripts.format).toBe("biome format --write .");
			expect(updatedContent.scripts.lint).toBe("biome lint .");
		});

		it("should preserve existing scripts when adding defaults", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc --build",
					test: "vitest run",
				},
			};
			const filePath = createPackageJson(json);

			await PackageScripts.handler(
				createArgs(
					filePath,
					{
						must: [{ clean: "rimraf dist" }],
					},
					true,
				),
			);

			// Verify existing scripts were preserved
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.build).toBe("tsc --build");
			expect(updatedContent.scripts.test).toBe("vitest run");
			expect(updatedContent.scripts.clean).toBe("rimraf dist");
		});

		it("should handle must with only string entries (no auto-fix available)", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					must: ["clean", "build", "test"],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
			}
		});
	});

	describe("'exact' validation (must exist AND match)", () => {
		it("should pass when existing script matches exact value", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist esm",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					exact: {
						clean: "rimraf dist esm",
					},
				}),
			);

			expect(result).toBe(true);
		});

		it("should fail when existing script doesn't match exact value", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					exact: {
						clean: "rimraf dist esm",
					},
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(true);
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("rimraf dist esm");
				expect(result.errorMessage).toContain("rm -rf dist");
			}
		});

		it("should fail for missing scripts (exact requires script to exist)", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					exact: {
						clean: "rimraf dist esm",
					},
				}),
			);

			// Should fail because "clean" doesn't exist - exact requires the script to exist
			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(true);
				expect(result.errorMessage).toContain("Missing required script");
				expect(result.errorMessage).toContain("clean");
			}
		});

		it("should auto-fix mismatched scripts when resolve is true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist",
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						exact: {
							clean: "rimraf dist esm",
						},
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify the file was updated
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist esm");
			expect(updatedContent.scripts.build).toBe("tsc"); // Preserved
		});

		it("should validate multiple scripts with exact", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist",
					format: "prettier --write .",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(filePath, {
					exact: {
						clean: "rimraf dist esm",
						format: "biome format --write .",
					},
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(true);
				expect(result.errorMessage).toContain("clean");
				expect(result.errorMessage).toContain("format");
			}
		});

		it("should auto-fix multiple mismatched scripts", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rm -rf dist",
					format: "prettier --write .",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						exact: {
							clean: "rimraf dist esm",
							format: "biome format --write .",
						},
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify both scripts were updated
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist esm");
			expect(updatedContent.scripts.format).toBe("biome format --write .");
		});

		it("should work with must and exact together", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						must: ["build"], // build must exist (already does)
						exact: {
							clean: "rimraf dist esm", // clean must exist AND match exactly
						},
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify clean was added with exact value
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist esm");
		});

		it("should use exact values for conditionalRequired auto-fix", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						exact: {
							clean: "rimraf dist esm",
						},
						conditionalRequired: [{ ifPresent: "build", requires: ["clean"] }],
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify clean was added with exact value
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist esm");
		});

		it("should auto-fix missing scripts when resolve is true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);

			const result = await PackageScripts.handler(
				createArgs(
					filePath,
					{
						exact: {
							clean: "rimraf dist esm",
						},
					},
					true,
				),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify clean was added with exact value
			const updatedContent = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedContent.scripts.clean).toBe("rimraf dist esm");
		});
	});
});

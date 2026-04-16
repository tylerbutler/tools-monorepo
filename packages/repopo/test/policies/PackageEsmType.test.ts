import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageEsmType,
	type PackageEsmTypeConfig,
} from "../../src/policies/PackageEsmType.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("PackageEsmType policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-esm-type-test-"));
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
		config?: PackageEsmTypeConfig,
		resolve = false,
	): PolicyFunctionArguments<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve,
		config,
	});

	describe("when config is undefined", () => {
		it("should skip validation", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("requiredType validation", () => {
		it("should pass when type matches requiredType module", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				type: "module",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "module" }),
			);
			expect(result).toBe(true);
		});

		it("should pass when type matches requiredType commonjs", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				type: "commonjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "commonjs" }),
			);
			expect(result).toBe(true);
		});

		it("should fail when type is missing but required", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "module" }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("missing");
				expect(result.errorMessages.join()).toContain("module");
				expect(result.autoFixable).toBe(true);
			}
		});

		it("should fail when type is wrong", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				type: "commonjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "module" }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("commonjs");
				expect(result.errorMessages.join()).toContain("module");
			}
		});
	});

	describe("detectFromExports", () => {
		it("should detect module from .mjs in exports", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				exports: {
					".": "./dist/index.mjs",
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { detectFromExports: true }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("module");
			}
		});

		it("should detect module from import condition in exports", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				exports: {
					".": {
						import: "./dist/index.js",
						require: "./dist/index.cjs",
					},
				},
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { detectFromExports: true }),
			);

			// Should detect as module due to "import" condition
			expect(result).not.toBe(true);
		});

		it("should detect commonjs from .cjs in exports", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				exports: "./dist/index.cjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { detectFromExports: true }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("commonjs");
			}
		});

		it("should detect module from .mjs main field", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				main: "./dist/index.mjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { detectFromExports: true }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("module");
			}
		});

		it("should detect module from module field", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				main: "./dist/index.js",
				module: "./dist/index.esm.js",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { detectFromExports: true }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("module");
			}
		});

		it("should pass when type already matches detected type", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				type: "module",
				exports: "./dist/index.mjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { detectFromExports: true }),
			);
			expect(result).toBe(true);
		});

		it("should skip when type cannot be detected", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				main: "./dist/index.js",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { detectFromExports: true }),
			);
			expect(result).toBe(true);
		});
	});

	describe("excludePackages", () => {
		it("should skip validation for excluded packages", async () => {
			const json: PackageJson = {
				name: "@myorg/excluded",
				version: "1.0.0",
				type: "commonjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, {
					requiredType: "module",
					excludePackages: ["@myorg/excluded"],
				}),
			);
			expect(result).toBe(true);
		});

		it("should skip packages matching scope exclusion", async () => {
			const json: PackageJson = {
				name: "@legacy/old-package",
				version: "1.0.0",
				type: "commonjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, {
					requiredType: "module",
					excludePackages: ["@legacy"],
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("auto-fix", () => {
		it("should add type field when missing", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "module" }, true),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.resolved).toBe(true);
			}

			const updatedJson = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedJson.type).toBe("module");
		});

		it("should update type field when wrong", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				type: "commonjs",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "module" }, true),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.resolved).toBe(true);
			}

			const updatedJson = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedJson.type).toBe("module");
		});
	});

	describe("special cases", () => {
		it("should skip root package", async () => {
			const json: PackageJson = {
				name: "root",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "module" }),
			);
			expect(result).toBe(true);
		});

		it("should skip packages without a name", async () => {
			const json: PackageJson = {
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackageEsmType.handler,
				createArgs(filePath, { requiredType: "module" }),
			);
			expect(result).toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageEsmType.name).toBe("PackageEsmType");
		});
	});
});

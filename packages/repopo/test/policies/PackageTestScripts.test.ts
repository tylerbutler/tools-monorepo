import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageTestScripts,
	type PackageTestScriptsConfig,
} from "../../src/policies/PackageTestScripts.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("PackageTestScripts policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-test-scripts-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const createPackageJson = (json: PackageJson, subdir = ""): string => {
		const packageDir = subdir ? join(tempDir, subdir) : tempDir;
		mkdirSync(packageDir, { recursive: true });
		const filePath = join(packageDir, "package.json");
		writeFileSync(filePath, JSON.stringify(json, null, 2));
		return filePath;
	};

	const createTestDir = (dirName: string, subdir = ""): void => {
		const packageDir = subdir ? join(tempDir, subdir) : tempDir;
		mkdirSync(join(packageDir, dirName), { recursive: true });
	};

	const createArgs = (
		filePath: string,
		config?: PackageTestScriptsConfig,
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
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("test directory detection", () => {
		it("should require test script when test/ directory exists", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("test directory exists");
				expect(result.errorMessage).toContain("test");
			}
		});

		it("should require test script when tests/ directory exists", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("tests");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test", "tests"] }),
			);

			expect(result).not.toBe(true);
		});

		it("should require test script when __tests__/ directory exists", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("__tests__");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test", "__tests__"] }),
			);

			expect(result).not.toBe(true);
		});

		it("should pass when test directory exists and test script is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test"] }),
			);
			expect(result).toBe(true);
		});

		it("should pass when no test directory exists", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);
			// Don't create any test directory

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test", "tests"] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("test dependency detection", () => {
		it("should require test script when vitest is in devDependencies", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
				devDependencies: {
					vitest: "^1.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDependencies: ["vitest", "jest"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("test dependencies");
				expect(result.errorMessage).toContain("vitest");
			}
		});

		it("should require test script when jest is in devDependencies", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
				devDependencies: {
					jest: "^29.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDependencies: ["vitest", "jest"] }),
			);

			expect(result).not.toBe(true);
		});

		it("should pass when test dependency exists and test script is present", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
				},
				devDependencies: {
					vitest: "^1.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDependencies: ["vitest", "jest"] }),
			);
			expect(result).toBe(true);
		});

		it("should pass when no test dependency exists", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
				devDependencies: {
					typescript: "^5.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDependencies: ["vitest", "jest"] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("onlyCheckDirectories", () => {
		it("should ignore dependencies when onlyCheckDirectories is true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
				devDependencies: {
					vitest: "^1.0.0",
				},
			};
			const filePath = createPackageJson(json);

			const result = await PackageTestScripts.handler(
				createArgs(filePath, {
					testDependencies: ["vitest"],
					onlyCheckDirectories: true,
				}),
			);
			expect(result).toBe(true);
		});

		it("should still check directories when onlyCheckDirectories is true", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, {
					testDirectories: ["test"],
					onlyCheckDirectories: true,
				}),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("requiredScripts", () => {
		it("should check for custom required scripts", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, {
					testDirectories: ["test"],
					requiredScripts: ["test", "test:coverage"],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("test:coverage");
			}
		});

		it("should pass when all required scripts exist", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
					"test:coverage": "vitest --coverage",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, {
					testDirectories: ["test"],
					requiredScripts: ["test", "test:coverage"],
				}),
			);
			expect(result).toBe(true);
		});
	});

	describe("excludePackages", () => {
		it("should skip validation for excluded packages", async () => {
			const json: PackageJson = {
				name: "@myorg/excluded",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, {
					testDirectories: ["test"],
					excludePackages: ["@myorg/excluded"],
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
				scripts: {},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test"] }),
			);
			expect(result).toBe(true);
		});

		it("should skip packages without a name", async () => {
			const json: PackageJson = {
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test"] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageTestScripts.name).toBe("PackageTestScripts");
		});

		it("should mark failures as not auto-fixable", async () => {
			const json: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};
			const filePath = createPackageJson(json);
			createTestDir("test");

			const result = await PackageTestScripts.handler(
				createArgs(filePath, { testDirectories: ["test"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
			}
		});
	});
});

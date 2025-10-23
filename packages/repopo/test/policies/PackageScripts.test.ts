import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "effection";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PackageScripts } from "../../src/policies/PackageScripts.js";
import type { PolicyFailure } from "../../src/policy.js";

describe("PackageScripts Policy", () => {
	let testDir: string;
	let packageJsonPath: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-scripts-test-"));
		packageJsonPath = join(testDir, "package.json");
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Policy Definition", () => {
		it("should have correct policy name", () => {
			expect(PackageScripts.name).toBe("PackageScripts");
		});

		it("should match package.json files", () => {
			expect(PackageScripts.match).toBeDefined();
			expect("package.json").toMatch(PackageScripts.match);
			expect("src/package.json").toMatch(PackageScripts.match);
		});

		it("should have handler function", () => {
			expect(PackageScripts.handler).toBeDefined();
			expect(typeof PackageScripts.handler).toBe("function");
		});

		it("should not have resolver (not auto-fixable)", () => {
			expect(PackageScripts.resolver).toBeUndefined();
		});
	});

	describe("Required Scripts Validation", () => {
		it("should pass when all required scripts are present", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rimraf dist",
					test: "vitest",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});

		it("should fail when build script is missing", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					clean: "rimraf dist",
					test: "vitest",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result).toHaveProperty("name", "PackageScripts");
			expect(result).toHaveProperty("autoFixable", false);
			expect(result.errorMessage).toContain("build");
		});

		it("should fail when clean script is missing", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					test: "vitest",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.errorMessage).toContain("clean");
		});

		it("should fail when both required scripts are missing", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
					lint: "eslint .",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.errorMessage).toContain("build");
			expect(result.errorMessage).toContain("clean");
		});

		it("should pass when scripts field is missing entirely", async () => {
			// Note: The current implementation only checks for missing scripts
			// if the scripts field exists. If scripts field is missing entirely,
			// it returns true. This may be intentional to allow packages without scripts.
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});

		it("should fail when scripts field is empty object", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.errorMessage).toContain("missing the following scripts");
		});
	});

	describe("Error Messages", () => {
		it("should provide clear error message for single missing script", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result.errorMessage).toBeDefined();
			expect(result.errorMessage).toContain("missing the following scripts");
			expect(result.errorMessage).toContain("clean");
			expect(result.errorMessage).not.toContain("build");
		});

		it("should list all missing scripts in error message", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result.errorMessage).toContain("build");
			expect(result.errorMessage).toContain("clean");
			expect(result.errorMessage).toContain("\n\t");
		});

		it("should include file path in failure result", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result.file).toBe(packageJsonPath);
		});
	});

	describe("Additional Script Scenarios", () => {
		it("should allow additional scripts beyond required ones", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "tsc",
					clean: "rimraf dist",
					test: "vitest",
					lint: "eslint .",
					format: "prettier --write .",
					"pre-commit": "lint-staged",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});

		it("should not care about script commands, only their presence", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "echo 'custom build'",
					clean: "echo 'custom clean'",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});

		it("should accept empty string as script command", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					build: "",
					clean: "",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});
	});

	describe("Auto-Fix Behavior", () => {
		it("should not be auto-fixable", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config: undefined,
				}),
			)) as PolicyFailure;

			expect(result.autoFixable).toBe(false);
		});

		it("should behave same with or without resolve flag", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: { test: "vitest" },
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const resultWithoutResolve = await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			const resultWithResolve = await run(() =>
				PackageScripts.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config: undefined,
				}),
			);

			expect(resultWithoutResolve).toEqual(resultWithResolve);
		});
	});
});

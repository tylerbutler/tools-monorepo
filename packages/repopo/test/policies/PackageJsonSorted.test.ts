import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PackageJsonSorted } from "../../src/policies/PackageJsonSorted.js";
import type { PolicyFailure, PolicyFixResult } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("PackageJsonSorted Policy", () => {
	let testDir: string;
	let packageJsonPath: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-sorted-test-"));
		packageJsonPath = join(testDir, "package.json");
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Policy Definition", () => {
		it("should have correct policy name", () => {
			expect(PackageJsonSorted.name).toBe("PackageJsonSorted");
		});

		it("should match package.json files", () => {
			expect(PackageJsonSorted.match).toBeDefined();
			expect("package.json").toMatch(PackageJsonSorted.match);
		});
	});

	describe("Sorting Detection", () => {
		it("should pass when package.json is properly sorted", async () => {
			// This is the expected order by sort-package-json
			const sortedPackageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				description: "A test package",
				keywords: ["test"],
				homepage: "https://example.com",
				bugs: "https://example.com/issues",
				license: "MIT",
				author: "Test Author",
				main: "index.js",
				scripts: {
					build: "tsc",
					test: "vitest",
				},
				dependencies: {
					"some-dep": "^1.0.0",
				},
				devDependencies: {
					typescript: "~5.0.0",
				},
			};

			await writeFile(
				packageJsonPath,
				JSON.stringify(sortedPackageJson, null, 2),
			);

			const result = await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			expect(result).toBe(true);
		});

		it("should fail when package.json is not sorted", async () => {
			// Intentionally unsorted (dependencies before scripts)
			const unsortedPackageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					"some-dep": "^1.0.0",
				},
				scripts: {
					build: "tsc",
					test: "vitest",
				},
			};

			await writeFile(
				packageJsonPath,
				JSON.stringify(unsortedPackageJson, null, 2),
			);

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			})) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result).toHaveProperty("autoFixable", true);
		});

		it("should fail when scripts are not alphabetically sorted", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					test: "vitest",
					build: "tsc",
					clean: "rimraf dist",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			})) as PolicyFailure;

			expect(result).not.toBe(true);
		});

		it("should fail when dependencies are not alphabetically sorted", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					zebra: "^1.0.0",
					alpha: "^2.0.0",
					"middle-package": "^1.5.0",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			})) as PolicyFailure;

			expect(result).not.toBe(true);
		});
	});

	describe("Auto-Fix Behavior", () => {
		it("should be marked as auto-fixable", async () => {
			const unsortedPackageJson = {
				version: "1.0.0",
				name: "test-package",
			};

			await writeFile(
				packageJsonPath,
				JSON.stringify(unsortedPackageJson, null, 2),
			);

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			})) as PolicyFailure;

			expect(result.autoFixable).toBe(true);
		});

		it("should fix unsorted package.json when resolve is true", async () => {
			const unsortedPackageJson = {
				version: "1.0.0",
				name: "test-package",
				dependencies: {
					zebra: "^1.0.0",
					alpha: "^2.0.0",
				},
			};

			await writeFile(
				packageJsonPath,
				JSON.stringify(unsortedPackageJson, null, 2),
			);

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: true,
				config: undefined,
			})) as PolicyFixResult;

			expect(result.resolved).toBe(true);

			// Verify file was sorted
			const content = await readFile(packageJsonPath, "utf-8");
			const parsedContent = JSON.parse(content);

			// Name should come before version
			const keys = Object.keys(parsedContent);
			expect(keys.indexOf("name")).toBeLessThan(keys.indexOf("version"));

			// Dependencies should be sorted
			if (parsedContent.dependencies) {
				const depKeys = Object.keys(parsedContent.dependencies);
				expect(depKeys).toEqual(["alpha", "zebra"]);
			}
		});

		it("should not modify file when resolve is false", async () => {
			const unsortedPackageJson = {
				version: "1.0.0",
				name: "test-package",
			};

			const originalContent = JSON.stringify(unsortedPackageJson, null, 2);
			await writeFile(packageJsonPath, originalContent);

			await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			const content = await readFile(packageJsonPath, "utf-8");
			expect(content).toBe(originalContent);
		});

		it("should sort nested objects like scripts", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				scripts: {
					ztest: "vitest",
					build: "tsc",
					aclean: "rimraf dist",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: true,
				config: undefined,
			});

			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			const scriptKeys = Object.keys(content.scripts);
			expect(scriptKeys).toEqual(["aclean", "build", "ztest"]);
		});

		it("should handle minimal package.json", async () => {
			const minimalPackageJson = {
				version: "0.0.1",
				name: "minimal",
			};

			await writeFile(
				packageJsonPath,
				JSON.stringify(minimalPackageJson, null, 2),
			);

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: true,
				config: undefined,
			})) as PolicyFixResult;

			expect(result.resolved).toBe(true);

			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			const keys = Object.keys(content);
			expect(keys[0]).toBe("name");
			expect(keys[1]).toBe("version");
		});
	});

	describe("Complex Sorting Scenarios", () => {
		it("should sort all standard fields in correct order", async () => {
			const packageJson = {
				devDependencies: { vitest: "^1.0.0" },
				scripts: { test: "vitest" },
				dependencies: { express: "^4.0.0" },
				author: "Test",
				license: "MIT",
				description: "Test package",
				version: "1.0.0",
				name: "test-package",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: true,
				config: undefined,
			});

			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			const keys = Object.keys(content);

			// sort-package-json has a specific order
			expect(keys.indexOf("name")).toBe(0);
			expect(keys.indexOf("version")).toBe(1);
			expect(keys.indexOf("description")).toBe(2);
		});

		it("should preserve all fields while sorting", async () => {
			const packageJson: PackageJson = {
				version: "1.0.0",
				name: "test-package",
				description: "Test",
				keywords: ["test"],
				homepage: "https://example.com",
				repository: "https://github.com/test/repo",
				dependencies: {
					"dep-b": "^1.0.0",
					"dep-a": "^2.0.0",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: true,
				config: undefined,
			});

			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));

			// Verify all fields are preserved
			expect(content.name).toBe("test-package");
			expect(content.version).toBe("1.0.0");
			expect(content.description).toBe("Test");
			expect(content.keywords).toEqual(["test"]);
			expect(content.homepage).toBe("https://example.com");
			expect(content.repository).toBe("https://github.com/test/repo");
			expect(content.dependencies).toBeDefined();
		});

		it("should handle package.json with workspaces", async () => {
			const packageJson: PackageJson = {
				workspaces: ["packages/*"],
				version: "1.0.0",
				name: "monorepo",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: true,
				config: undefined,
			});

			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(content.workspaces).toEqual(["packages/*"]);
		});
	});

	describe("Error Handling", () => {
		it("should return error result when file update fails during resolve", async () => {
			// Create unsorted package.json
			const unsortedPackageJson = {
				version: "1.0.0",
				name: "test-package",
			};
			await writeFile(
				packageJsonPath,
				JSON.stringify(unsortedPackageJson, null, 2),
			);

			// Make the file read-only to cause updatePackageJsonFile to fail
			const { chmod } = await import("node:fs/promises");
			await chmod(packageJsonPath, 0o444); // read-only

			try {
				const result = (await runHandler(PackageJsonSorted.handler, {
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config: undefined,
				})) as PolicyFixResult;

				// Should return a fix result with resolved: false and error messages
				expect(result.resolved).toBe(false);
				expect(result.autoFixable).toBe(true);
				expect(result.errorMessages.length).toBeGreaterThan(0);
			} finally {
				// Restore write permissions so cleanup can succeed
				await chmod(packageJsonPath, 0o644);
			}
		});

		it("should handle file path in failure result", async () => {
			const unsortedPackageJson = {
				version: "1.0.0",
				name: "test-package",
			};

			await writeFile(
				packageJsonPath,
				JSON.stringify(unsortedPackageJson, null, 2),
			);

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			})) as PolicyFailure;

			expect(result.file).toBe(packageJsonPath);
		});

		it("should include policy name in result", async () => {
			const unsortedPackageJson = {
				version: "1.0.0",
				name: "test-package",
			};

			await writeFile(
				packageJsonPath,
				JSON.stringify(unsortedPackageJson, null, 2),
			);

			const result = (await runHandler(PackageJsonSorted.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			})) as PolicyFailure;

			expect(result.name).toBe("PackageJsonSorted");
		});
	});
});

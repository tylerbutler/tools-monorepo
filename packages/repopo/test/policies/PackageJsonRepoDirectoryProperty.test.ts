import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PackageJsonRepoDirectoryProperty } from "../../src/policies/PackageJsonRepoDirectoryProperty.js";
import type { PolicyFailure, PolicyFixResult } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("PackageJsonRepoDirectoryProperty Policy", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-repo-dir-test-"));
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Policy Definition", () => {
		it("should have correct policy name", () => {
			expect(PackageJsonRepoDirectoryProperty.name).toBe(
				"PackageJsonRepoDirectoryProperty",
			);
		});

		it("should match package.json files", () => {
			expect(PackageJsonRepoDirectoryProperty.match).toBeDefined();
			expect("package.json").toMatch(PackageJsonRepoDirectoryProperty.match);
		});
	});

	describe("Validation", () => {
		it("should pass when repository.directory matches actual directory", async () => {
			const subDir = join(testDir, "packages", "my-package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "my-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "packages/my-package",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			// Note: file is passed as absolute path to the handler
			const result = await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				},
			);

			expect(result).toBe(true);
		});

		it("should pass when repository is a string (not an object)", async () => {
			const packageJsonPath = join(testDir, "package.json");

			const packageJson = {
				name: "my-package",
				version: "1.0.0",
				repository: "https://github.com/test/repo.git",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				},
			);

			expect(result).toBe(true);
		});

		it("should pass when package is at repo root and directory is undefined", async () => {
			const packageJsonPath = join(testDir, "package.json");

			const packageJson: PackageJson = {
				name: "root-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				},
			);

			expect(result).toBe(true);
		});

		it("should fail when repository.directory does not match actual directory", async () => {
			const subDir = join(testDir, "packages", "my-package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "my-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "wrong/path",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				},
			)) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.autoFixable).toBe(true);
			expect(result.errorMessages.length).toBeGreaterThan(0);
			expect(result.errorMessages[0]).toContain("packages/my-package");
			expect(result.errorMessages[0]).toContain("wrong/path");
		});

		it("should fail when package in subdirectory has repository.directory set to empty string", async () => {
			const subDir = join(testDir, "packages", "sub-package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "sub-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				},
			)) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.autoFixable).toBe(true);
		});
	});

	describe("Auto-Fix Behavior", () => {
		it("should fix incorrect repository.directory when resolve is true", async () => {
			const subDir = join(testDir, "packages", "my-package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "my-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "wrong/path",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config: undefined,
				},
			)) as PolicyFixResult;

			expect(result.resolved).toBe(true);

			// Verify the file was updated
			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(content.repository.directory).toBe("packages/my-package");
		});

		it("should remove directory property when package is at root", async () => {
			const packageJsonPath = join(testDir, "package.json");

			const packageJson: PackageJson = {
				name: "root-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "wrong/path",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = (await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config: undefined,
				},
			)) as PolicyFixResult;

			expect(result.resolved).toBe(true);

			// Verify the file was updated - directory should be removed
			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(content.repository.directory).toBeUndefined();
		});

		it("should not modify file when resolve is false", async () => {
			const subDir = join(testDir, "packages", "my-package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "my-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "wrong/path",
				},
			};

			const originalContent = JSON.stringify(packageJson, null, 2);
			await writeFile(packageJsonPath, originalContent);

			await runHandler(PackageJsonRepoDirectoryProperty.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: false,
				config: undefined,
			});

			const content = await readFile(packageJsonPath, "utf-8");
			expect(content).toBe(originalContent);
		});
	});

	describe("Error Handling", () => {
		it("should return error result when file update fails", async () => {
			// Create a package.json with wrong directory
			const subDir = join(testDir, "packages", "my-package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "my-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "wrong/path",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			// Make the file read-only to cause updatePackageJsonFile to fail
			const { chmod } = await import("node:fs/promises");
			await chmod(packageJsonPath, 0o444); // read-only

			try {
				const result = (await runHandler(
					PackageJsonRepoDirectoryProperty.handler,
					{
						file: packageJsonPath,
						root: testDir,
						resolve: true,
						config: undefined,
					},
				)) as PolicyFixResult;

				// Policy should return a failure with resolved=false and error messages
				expect(result.resolved).toBe(false);
				expect(result.errorMessages.length).toBeGreaterThan(0);
			} finally {
				// Restore write permissions so cleanup can succeed
				await chmod(packageJsonPath, 0o644);
			}
		});
	});

	describe("Edge Cases", () => {
		it("should handle deeply nested packages", async () => {
			const subDir = join(testDir, "packages", "scope", "deep", "package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "@scope/deep-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "packages/scope/deep/package",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await runHandler(
				PackageJsonRepoDirectoryProperty.handler,
				{
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				},
			);

			expect(result).toBe(true);
		});

		it("should preserve other repository properties when fixing", async () => {
			const subDir = join(testDir, "packages", "my-package");
			await mkdir(subDir, { recursive: true });
			const packageJsonPath = join(subDir, "package.json");

			const packageJson: PackageJson = {
				name: "my-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "https://github.com/test/repo.git",
					directory: "wrong/path",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			await runHandler(PackageJsonRepoDirectoryProperty.handler, {
				file: packageJsonPath,
				root: testDir,
				resolve: true,
				config: undefined,
			});

			const content = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(content.repository.type).toBe("git");
			expect(content.repository.url).toBe("https://github.com/test/repo.git");
			expect(content.repository.directory).toBe("packages/my-package");
		});
	});
});

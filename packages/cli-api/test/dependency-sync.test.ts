import { mkdtempSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type DependencyInfo,
	getInstalledVersions,
	isSyncSupported,
	isValidSemver,
	parseNpmList,
	parsePackageManagerList,
	parsePnpmList,
	shouldSkipVersion,
	syncAllPackages,
	syncDependencyGroup,
	syncPackageJson,
	updateVersionRange,
} from "../src/dependency-sync.js";

// Mock execFileSync for getInstalledVersions tests
vi.mock("node:child_process", () => ({
	execFileSync: vi.fn(),
}));

describe("dependency-sync", () => {
	describe("isSyncSupported", () => {
		it("returns true for npm", () => {
			expect(isSyncSupported("npm")).toBe(true);
		});

		it("returns true for pnpm", () => {
			expect(isSyncSupported("pnpm")).toBe(true);
		});

		it("returns false for yarn", () => {
			expect(isSyncSupported("yarn")).toBe(false);
		});

		it("returns false for bun", () => {
			expect(isSyncSupported("bun")).toBe(false);
		});
	});

	describe("shouldSkipVersion", () => {
		it("returns true for link: protocol", () => {
			expect(shouldSkipVersion("link:../foo")).toBe(true);
		});

		it("returns true for file: protocol", () => {
			expect(shouldSkipVersion("file:../foo")).toBe(true);
		});

		it("returns true for git: protocol", () => {
			expect(shouldSkipVersion("git:https://github.com/foo/bar")).toBe(true);
		});

		it("returns true for git+ protocol", () => {
			expect(shouldSkipVersion("git+https://github.com/foo/bar")).toBe(true);
		});

		it("returns true for http: protocol", () => {
			expect(shouldSkipVersion("http://example.com/foo.tar.gz")).toBe(true);
		});

		it("returns true for https: protocol", () => {
			expect(shouldSkipVersion("https://example.com/foo.tar.gz")).toBe(true);
		});

		it("returns true for workspace: protocol", () => {
			expect(shouldSkipVersion("workspace:^")).toBe(true);
		});

		it("returns false for valid semver", () => {
			expect(shouldSkipVersion("1.2.3")).toBe(false);
		});

		it("returns false for caret range", () => {
			expect(shouldSkipVersion("^1.2.3")).toBe(false);
		});

		it("returns false for tilde range", () => {
			expect(shouldSkipVersion("~1.2.3")).toBe(false);
		});
	});

	describe("isValidSemver", () => {
		it("returns true for valid semver", () => {
			expect(isValidSemver("1.2.3")).toBe(true);
		});

		it("returns true for pre-release versions", () => {
			expect(isValidSemver("1.2.3-beta.1")).toBe(true);
		});

		it("returns true for versions with build metadata", () => {
			expect(isValidSemver("1.2.3+build.123")).toBe(true);
		});

		it("returns false for invalid versions", () => {
			expect(isValidSemver("invalid")).toBe(false);
		});

		it("returns false for version ranges", () => {
			expect(isValidSemver("^1.2.3")).toBe(false);
		});

		it("returns false for protocols", () => {
			expect(isValidSemver("link:../foo")).toBe(false);
		});
	});

	describe("updateVersionRange", () => {
		describe("caret ranges", () => {
			it("updates caret range to new version", () => {
				const result = updateVersionRange("^1.0.0", "1.2.3");
				expect(result).toEqual({
					updated: "^1.2.3",
					skipped: false,
				});
			});

			it("preserves caret prefix", () => {
				const result = updateVersionRange("^4.4.1", "4.4.3");
				expect(result.updated).toBe("^4.4.3");
			});
		});

		describe("tilde ranges", () => {
			it("updates tilde range to new version", () => {
				const result = updateVersionRange("~1.0.0", "1.0.5");
				expect(result).toEqual({
					updated: "~1.0.5",
					skipped: false,
				});
			});

			it("preserves tilde prefix", () => {
				const result = updateVersionRange("~7.7.1", "7.7.3");
				expect(result.updated).toBe("~7.7.3");
			});
		});

		describe("exact versions", () => {
			it("updates exact version", () => {
				const result = updateVersionRange("1.0.0", "1.2.3");
				expect(result).toEqual({
					updated: "1.2.3",
					skipped: false,
				});
			});
		});

		describe("workspace protocol", () => {
			it("preserves workspace: protocol", () => {
				const result = updateVersionRange("workspace:^", "1.2.3");
				expect(result).toEqual({
					updated: "workspace:^",
					skipped: true,
				});
			});

			it("preserves workspace:* protocol", () => {
				const result = updateVersionRange("workspace:*", "1.2.3");
				expect(result).toEqual({
					updated: "workspace:*",
					skipped: true,
				});
			});
		});

		describe("special protocols", () => {
			it("preserves npm: protocol", () => {
				const result = updateVersionRange("npm:foo@1.0.0", "1.2.3");
				expect(result).toEqual({
					updated: "npm:foo@1.0.0",
					skipped: true,
				});
			});

			it("preserves catalog: protocol", () => {
				const result = updateVersionRange("catalog:default", "1.2.3");
				expect(result).toEqual({
					updated: "catalog:default",
					skipped: true,
				});
			});
		});

		describe("complex ranges", () => {
			it("preserves >= range without warning", () => {
				const result = updateVersionRange(">=1.0.0", "1.2.3");
				expect(result.skipped).toBe(true);
				expect(result.updated).toBe(">=1.0.0");
				expect(result.warning).toBeUndefined();
			});

			it("preserves <= range without warning", () => {
				const result = updateVersionRange("<=2.0.0", "1.2.3");
				expect(result.skipped).toBe(true);
				expect(result.warning).toBeUndefined();
			});

			it("preserves > range without warning", () => {
				const result = updateVersionRange(">1.0.0", "1.2.3");
				expect(result.skipped).toBe(true);
				expect(result.warning).toBeUndefined();
			});

			it("preserves < range without warning", () => {
				const result = updateVersionRange("<2.0.0", "1.2.3");
				expect(result.skipped).toBe(true);
				expect(result.warning).toBeUndefined();
			});

			it("emitWarnings option does not affect complex ranges", () => {
				const result = updateVersionRange(">=1.0.0", "1.2.3", {
					emitWarnings: false,
				});
				expect(result.warning).toBeUndefined();
			});
		});

		describe("hyphen ranges", () => {
			it("preserves hyphen range without warning", () => {
				const result = updateVersionRange("1.0.0 - 2.0.0", "1.5.0");
				expect(result.skipped).toBe(true);
				expect(result.updated).toBe("1.0.0 - 2.0.0");
				expect(result.warning).toBeUndefined();
			});

			it("emitWarnings option does not affect hyphen ranges", () => {
				const result = updateVersionRange("1.0.0 - 2.0.0", "1.5.0", {
					emitWarnings: false,
				});
				expect(result.warning).toBeUndefined();
			});
		});

		describe("special values", () => {
			it("preserves * wildcard", () => {
				const result = updateVersionRange("*", "1.2.3");
				expect(result).toEqual({
					updated: "*",
					skipped: true,
				});
			});

			it("preserves latest keyword", () => {
				const result = updateVersionRange("latest", "1.2.3");
				expect(result).toEqual({
					updated: "latest",
					skipped: true,
				});
			});
		});

		describe("invalid semver", () => {
			it("skips update for invalid installed version", () => {
				const result = updateVersionRange("^1.0.0", "invalid-version");
				expect(result.skipped).toBe(true);
				expect(result.updated).toBe("^1.0.0");
				expect(result.warning).toContain("not valid semver");
			});

			it("can suppress warnings", () => {
				const result = updateVersionRange("^1.0.0", "invalid-version", {
					emitWarnings: false,
				});
				expect(result.warning).toBeUndefined();
			});
		});
	});

	describe("parsePnpmList", () => {
		it("parses pnpm list output with dependencies", () => {
			const input = [
				{
					name: "test-package",
					path: "/path/to/package",
					dependencies: {
						debug: { version: "4.4.3" },
						semver: { version: "7.7.3" },
					},
					devDependencies: {
						vitest: { version: "3.2.4" },
					},
				},
			];

			const result = parsePnpmList(input);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: "test-package",
				path: "/path/to/package",
				dependencies: {
					debug: { version: "4.4.3" },
					semver: { version: "7.7.3" },
				},
				devDependencies: {
					vitest: { version: "3.2.4" },
				},
				peerDependencies: {},
				optionalDependencies: {},
			});
		});

		it("filters out workspace dependencies", () => {
			const input = [
				{
					name: "test-package",
					path: "/path/to/package",
					dependencies: {
						debug: { version: "4.4.3" },
						"@tylerbu/cli-api": { version: "link:../cli-api" },
					},
				},
			];

			const result = parsePnpmList(input);

			expect(result[0]?.dependencies).toEqual({
				debug: { version: "4.4.3" },
			});
		});

		it("handles multiple projects", () => {
			const input = [
				{
					name: "package-a",
					path: "/path/to/a",
					dependencies: { foo: { version: "1.0.0" } },
				},
				{
					name: "package-b",
					path: "/path/to/b",
					dependencies: { bar: { version: "2.0.0" } },
				},
			];

			const result = parsePnpmList(input);

			expect(result).toHaveLength(2);
			expect(result[0]?.name).toBe("package-a");
			expect(result[1]?.name).toBe("package-b");
		});

		it("handles empty dependencies", () => {
			const input = [
				{
					name: "test-package",
					path: "/path/to/package",
				},
			];

			const result = parsePnpmList(input);

			expect(result[0]).toEqual({
				name: "test-package",
				path: "/path/to/package",
				dependencies: {},
				devDependencies: {},
				peerDependencies: {},
				optionalDependencies: {},
			});
		});

		it("throws error for non-array input", () => {
			expect(() => parsePnpmList({})).toThrow(
				"Expected pnpm list output to be an array",
			);
		});
	});

	describe("parseNpmList", () => {
		it("parses npm list output with dependencies", () => {
			const input = {
				name: "test-package",
				path: "/path/to/package",
				dependencies: {
					debug: {
						version: "4.4.3",
						resolved: "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
					},
				},
				devDependencies: {
					vitest: {
						version: "3.2.4",
						resolved: "https://registry.npmjs.org/vitest/-/vitest-3.2.4.tgz",
					},
				},
			};

			const result = parseNpmList(input);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual({
				name: "test-package",
				path: "/path/to/package",
				dependencies: {
					debug: { version: "4.4.3" },
				},
				devDependencies: {
					vitest: { version: "3.2.4" },
				},
				peerDependencies: {},
				optionalDependencies: {},
			});
		});

		it("filters out workspace dependencies", () => {
			const input = {
				name: "test-package",
				path: "/path/to/package",
				dependencies: {
					debug: {
						version: "4.4.3",
						resolved: "https://registry.npmjs.org/debug/-/debug-4.4.3.tgz",
					},
					"workspace-pkg": {
						version: "1.0.0",
						resolved: "file:packages/workspace-pkg",
						path: "/path/to/workspace-pkg",
					},
				},
			};

			const result = parseNpmList(input);

			expect(result[0]?.dependencies).toEqual({
				debug: { version: "4.4.3" },
			});
		});

		it("extracts workspace projects from nested structure", () => {
			const input = {
				name: "root-package",
				path: "/path/to/root",
				dependencies: {
					"workspace-pkg": {
						version: "1.0.0",
						resolved: "file:packages/workspace-pkg",
						path: "/path/to/workspace-pkg",
						dependencies: {
							semver: {
								version: "7.7.3",
							},
						},
					},
				},
			};

			const result = parseNpmList(input);

			expect(result).toHaveLength(2);
			expect(result[1]).toEqual({
				name: "",
				path: "/path/to/workspace-pkg",
				dependencies: {
					semver: { version: "7.7.3" },
				},
				devDependencies: {},
				peerDependencies: {},
				optionalDependencies: {},
			});
		});

		it("uses working directory as fallback for path", () => {
			const input = {
				name: "test-package",
				dependencies: {},
			};

			const result = parseNpmList(input, "/custom/cwd");

			expect(result[0]?.path).toBe("/custom/cwd");
		});

		it("throws error for invalid input", () => {
			expect(() => parseNpmList(null)).toThrow(
				"Expected npm list output to be an object",
			);
		});
	});

	describe("parsePackageManagerList", () => {
		it("parses pnpm output", () => {
			const output = JSON.stringify([
				{
					name: "test-package",
					path: "/path",
					dependencies: {},
				},
			]);

			const result = parsePackageManagerList("pnpm", output);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("test-package");
		});

		it("parses npm output", () => {
			const output = JSON.stringify({
				name: "test-package",
				path: "/path",
				dependencies: {},
			});

			const result = parsePackageManagerList("npm", output);

			expect(result).toHaveLength(1);
			expect(result[0]?.name).toBe("test-package");
		});

		it("throws error for invalid JSON", () => {
			expect(() => parsePackageManagerList("pnpm", "invalid json")).toThrow(
				"Failed to parse pnpm list output",
			);
		});
	});

	describe("syncDependencyGroup", () => {
		it("updates dependencies that need syncing", () => {
			const dependencies = {
				debug: "^4.4.1",
				semver: "^7.7.1",
			};
			const installed: Record<string, DependencyInfo> = {
				debug: { version: "4.4.3" },
				semver: { version: "7.7.3" },
			};

			const result = syncDependencyGroup(
				dependencies,
				installed,
				"dependencies",
			);

			expect(result.changes).toHaveLength(2);
			expect(result.changes[0]).toEqual({
				dep: "debug",
				type: "dependencies",
				from: "^4.4.1",
				to: "^4.4.3",
			});
			expect(result.changes[1]).toEqual({
				dep: "semver",
				type: "dependencies",
				from: "^7.7.1",
				to: "^7.7.3",
			});
			expect(result.warnings).toHaveLength(0);
			expect(dependencies.debug).toBe("^4.4.3");
			expect(dependencies.semver).toBe("^7.7.3");
		});

		it("skips dependencies not in installed list", () => {
			const dependencies = {
				debug: "^4.4.1",
				"not-installed": "^1.0.0",
			};
			const installed: Record<string, DependencyInfo> = {
				debug: { version: "4.4.3" },
			};

			const result = syncDependencyGroup(
				dependencies,
				installed,
				"dependencies",
			);

			expect(result.changes).toHaveLength(1);
			expect(result.warnings).toHaveLength(0);
			expect(dependencies["not-installed"]).toBe("^1.0.0");
		});

		it("skips workspace dependencies", () => {
			const dependencies = {
				debug: "^4.4.1",
				"@tylerbu/cli-api": "workspace:^",
			};
			const installed: Record<string, DependencyInfo> = {
				debug: { version: "4.4.3" },
				"@tylerbu/cli-api": { version: "link:../cli-api" },
			};

			const result = syncDependencyGroup(
				dependencies,
				installed,
				"dependencies",
			);

			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]?.dep).toBe("debug");
			expect(result.warnings).toHaveLength(0);
			expect(dependencies["@tylerbu/cli-api"]).toBe("workspace:^");
		});

		it("handles devDependencies", () => {
			const dependencies = {
				vitest: "^3.2.1",
			};
			const installed: Record<string, DependencyInfo> = {
				vitest: { version: "3.2.4" },
			};

			const result = syncDependencyGroup(
				dependencies,
				installed,
				"devDependencies",
			);

			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]?.type).toBe("devDependencies");
			expect(result.warnings).toHaveLength(0);
		});
	});

	describe("syncPackageJson", () => {
		let tmpDir: string;

		beforeEach(() => {
			tmpDir = mkdtempSync(join(tmpdir(), "sync-package-json-test-"));
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("syncs package.json in dry-run mode", async () => {
			const packageJsonPath = join(tmpDir, "package.json");
			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					debug: "^4.4.1",
				},
			};
			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, "\t"));

			const installedDeps: Record<string, DependencyInfo> = {
				debug: { version: "4.4.3" },
			};

			const result = await syncPackageJson(
				packageJsonPath,
				installedDeps,
				{},
				{},
				{},
				{ write: false },
			);

			expect(result.changes).toHaveLength(1);
			expect(result.changes[0]).toEqual({
				dep: "debug",
				type: "dependencies",
				from: "^4.4.1",
				to: "^4.4.3",
			});

			// File should not be modified in dry-run mode
			const content = await readFile(packageJsonPath, "utf-8");
			const parsed = JSON.parse(content);
			expect(parsed.dependencies.debug).toBe("^4.4.1");
		});

		it("writes changes when write: true", async () => {
			const packageJsonPath = join(tmpDir, "package.json");
			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					debug: "^4.4.1",
				},
			};
			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, "\t"));

			const installedDeps: Record<string, DependencyInfo> = {
				debug: { version: "4.4.3" },
			};

			const result = await syncPackageJson(
				packageJsonPath,
				installedDeps,
				{},
				{},
				{},
				{ write: true },
			);

			expect(result.changes).toHaveLength(1);

			// File should be modified
			const content = await readFile(packageJsonPath, "utf-8");
			const parsed = JSON.parse(content);
			expect(parsed.dependencies.debug).toBe("^4.4.3");
		});

		it("syncs all dependency types", async () => {
			const packageJsonPath = join(tmpDir, "package.json");
			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: { debug: "^4.4.1" },
				devDependencies: { vitest: "^3.2.1" },
				peerDependencies: { react: "^18.0.0" },
				optionalDependencies: { fsevents: "^2.3.2" },
			};
			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, "\t"));

			const result = await syncPackageJson(
				packageJsonPath,
				{ debug: { version: "4.4.3" } },
				{ vitest: { version: "3.2.4" } },
				{ react: { version: "18.2.0" } },
				{ fsevents: { version: "2.3.3" } },
				{ write: true },
			);

			expect(result.changes).toHaveLength(4);
			expect(result.changes.map((c) => c.type)).toEqual([
				"dependencies",
				"devDependencies",
				"peerDependencies",
				"optionalDependencies",
			]);
		});

		it("returns empty changes if nothing to sync", async () => {
			const packageJsonPath = join(tmpDir, "package.json");
			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					debug: "^4.4.3",
				},
			};
			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, "\t"));

			const installedDeps: Record<string, DependencyInfo> = {
				debug: { version: "4.4.3" },
			};

			const result = await syncPackageJson(
				packageJsonPath,
				installedDeps,
				{},
				{},
				{},
			);

			expect(result.changes).toHaveLength(0);
		});

		it("throws error for missing file", async () => {
			const packageJsonPath = join(tmpDir, "nonexistent.json");

			await expect(
				syncPackageJson(packageJsonPath, {}, {}, {}, {}),
			).rejects.toThrow("Failed to read or parse");
		});

		it("throws error for invalid JSON", async () => {
			const packageJsonPath = join(tmpDir, "package.json");
			await writeFile(packageJsonPath, "invalid json");

			await expect(
				syncPackageJson(packageJsonPath, {}, {}, {}, {}),
			).rejects.toThrow("Failed to read or parse");
		});
	});

	describe("syncAllPackages", () => {
		let tmpDir: string;

		beforeEach(() => {
			tmpDir = mkdtempSync(join(tmpdir(), "sync-all-packages-test-"));
		});

		it("syncs multiple packages", async () => {
			// Create two packages
			const pkg1Path = join(tmpDir, "pkg1");
			const pkg2Path = join(tmpDir, "pkg2");

			await mkdir(pkg1Path, { recursive: true });
			await mkdir(pkg2Path, { recursive: true });

			await writeFile(
				join(pkg1Path, "package.json"),
				JSON.stringify({
					name: "pkg1",
					dependencies: { debug: "^4.4.1" },
				}),
			);

			await writeFile(
				join(pkg2Path, "package.json"),
				JSON.stringify({
					name: "pkg2",
					dependencies: { semver: "^7.7.1" },
				}),
			);

			const projects = [
				{
					name: "pkg1",
					path: pkg1Path,
					dependencies: { debug: { version: "4.4.3" } },
				},
				{
					name: "pkg2",
					path: pkg2Path,
					dependencies: { semver: { version: "7.7.3" } },
				},
			];

			const result = await syncAllPackages(projects, { write: true });

			expect(result.results).toHaveLength(2);
			expect(result.results[0]?.changes).toHaveLength(1);
			expect(result.results[1]?.changes).toHaveLength(1);
			expect(result.skippedProjects).toHaveLength(0);
		});

		it("skips projects without package.json", async () => {
			const projects = [
				{
					name: "missing-pkg",
					path: join(tmpDir, "nonexistent"),
					dependencies: { debug: { version: "4.4.3" } },
				},
			];

			const result = await syncAllPackages(projects);

			expect(result.results).toHaveLength(0);
			expect(result.skippedProjects).toHaveLength(1);
			expect(result.skippedProjects[0]).toEqual({
				name: "missing-pkg",
				path: join(tmpDir, "nonexistent"),
				reason: "package.json not found",
			});
		});

		it("filters out results with no changes", async () => {
			const pkgPath = join(tmpDir, "pkg");
			await mkdir(pkgPath, { recursive: true });
			await writeFile(
				join(pkgPath, "package.json"),
				JSON.stringify({
					name: "pkg",
					dependencies: { debug: "^4.4.3" },
				}),
			);

			const projects = [
				{
					name: "pkg",
					path: pkgPath,
					dependencies: { debug: { version: "4.4.3" } },
				},
			];

			const result = await syncAllPackages(projects);

			expect(result.results).toHaveLength(0);
			expect(result.skippedProjects).toHaveLength(0);
		});
	});

	describe("getInstalledVersions", () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("executes pnpm list command", async () => {
			const { execFileSync } = await import("node:child_process");
			vi.mocked(execFileSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: "/path",
						dependencies: {},
					},
				]),
			);

			const result = await getInstalledVersions("pnpm");

			expect(execFileSync).toHaveBeenCalledWith(
				"pnpm",
				["list", "--json", "--depth", "0", "--recursive"],
				expect.objectContaining({
					encoding: "utf-8",
					stdio: ["pipe", "pipe", "pipe"],
				}),
			);
			expect(result).toHaveLength(1);
		});

		it("executes npm list command", async () => {
			const { execFileSync } = await import("node:child_process");
			vi.mocked(execFileSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					dependencies: {},
				}),
			);

			const result = await getInstalledVersions("npm");

			expect(execFileSync).toHaveBeenCalledWith(
				"npm",
				["list", "--json", "--depth", "0", "--workspaces", "--all"],
				expect.objectContaining({
					encoding: "utf-8",
					stdio: ["pipe", "pipe", "pipe"],
				}),
			);
			expect(result).toHaveLength(1);
		});

		it("uses custom cwd option", async () => {
			const { execFileSync } = await import("node:child_process");
			vi.mocked(execFileSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: "/path",
						dependencies: {},
					},
				]),
			);

			await getInstalledVersions("pnpm", { cwd: "/custom/dir" });

			expect(execFileSync).toHaveBeenCalledWith(
				expect.any(String),
				expect.any(Array),
				expect.objectContaining({
					cwd: "/custom/dir",
				}),
			);
		});

		it("throws error with stderr when command fails", async () => {
			const { execFileSync } = await import("node:child_process");
			const mockError = new Error("Command failed") as Error & {
				stderr: string;
			};
			mockError.stderr = "pnpm: command not found";
			vi.mocked(execFileSync).mockImplementation(() => {
				throw mockError;
			});

			await expect(getInstalledVersions("pnpm")).rejects.toThrow(
				"Failed to get installed versions from pnpm",
			);
		});
	});
});

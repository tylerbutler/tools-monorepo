import { execSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { captureOutput } from "@oclif/test";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DepsSync from "../../../src/commands/deps/sync.js";

// Mock execSync at the top level
vi.mock("node:child_process", () => ({
	execSync: vi.fn(),
}));

describe("deps sync", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = temporaryDirectory();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("detectPackageManager", () => {
		it("detects pnpm from pnpm-lock.yaml", async () => {
			// Create pnpm-lock.yaml
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			// Mock execSync to return project with no dependencies
			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir]);
			});

			expect(stdout).toContain("🔄 Syncing package.json versions to lockfile");
			expect(stdout).toContain(
				"✅ All package.json files are already in sync with lockfile",
			);
		});

		it("detects npm from package-lock.json", async () => {
			// Create package-lock.json
			await writeFile(
				join(tmpDir, "package-lock.json"),
				JSON.stringify({ lockfileVersion: 3 }),
			);
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			// Mock execSync to return empty project list
			vi.mocked(execSync).mockReturnValue(
				JSON.stringify({
					name: "test-package",
					dependencies: {},
					devDependencies: {},
				}),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir]);
			});

			expect(stdout).toContain("🔄 Syncing package.json versions to lockfile");
			expect(stdout).toContain(
				"✅ All package.json files are already in sync with lockfile",
			);
		});

		it("errors when no lockfile is found", async () => {
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			const { error } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir]);
			});

			expect(error?.message).toMatch(/No lockfile found/);
		});

		it("errors for yarn.lock", async () => {
			await writeFile(join(tmpDir, "yarn.lock"), "# yarn lockfile v1");
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			const { error } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir]);
			});

			expect(error?.message).toMatch(/yarn is not yet fully supported/);
		});

		it("errors when multiple lockfiles are detected", async () => {
			// Create both pnpm and npm lockfiles
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			await writeFile(
				join(tmpDir, "package-lock.json"),
				JSON.stringify({ lockfileVersion: 3 }),
			);
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			const { error } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir]);
			});

			expect(error?.message).toMatch(/Multiple lockfiles detected/);
			expect(error?.message).toMatch(/Please use the --lockfile flag/);
		});
	});

	describe("version range updates", () => {
		it("syncs caret ranges to lockfile versions", async () => {
			// Create pnpm-lock.yaml
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			// Create package.json with outdated version
			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					debug: "^4.4.1",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			// Mock pnpm list output
			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							debug: { version: "4.4.3" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			// Verify output
			expect(stdout).toContain("🔄 Syncing package.json versions to lockfile");
			expect(stdout).toContain("✅ Updated 1 package.json file(s)");
			expect(stdout).toContain("📦 package.json");
			expect(stdout).toContain("debug");
			expect(stdout).toContain("^4.4.1");
			expect(stdout).toContain("^4.4.3");

			// Read updated package.json
			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.dependencies.debug).toBe("^4.4.3");
		});

		it("preserves tilde ranges", async () => {
			// Create pnpm-lock.yaml
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					semver: "~7.7.1",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							semver: { version: "7.7.3" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			expect(stdout).toContain("semver");
			expect(stdout).toContain("~7.7.1");
			expect(stdout).toContain("~7.7.3");

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.dependencies.semver).toBe("~7.7.3");
		});

		it("updates exact versions", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					typescript: "5.9.1",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							typescript: { version: "5.9.3" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			expect(stdout).toContain("typescript");
			expect(stdout).toContain("5.9.1");
			expect(stdout).toContain("5.9.3");

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.dependencies.typescript).toBe("5.9.3");
		});

		it("skips workspace protocol", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					"@tylerbu/cli-api": "workspace:^",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							"@tylerbu/cli-api": { version: "link:../cli-api" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			expect(stdout).toContain(
				"✅ All package.json files are already in sync with lockfile",
			);

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			// Workspace protocol should be unchanged
			expect(updated.dependencies["@tylerbu/cli-api"]).toBe("workspace:^");
		});

		it("skips special protocols (link, file, git)", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					local: "file:../local-package",
					linked: "link:../linked-package",
					github: "git+https://github.com/user/repo.git",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							local: { version: "file:../local-package" },
							linked: { version: "link:../linked-package" },
							github: { version: "git+https://github.com/user/repo.git" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			expect(stdout).toContain(
				"✅ All package.json files are already in sync with lockfile",
			);

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.dependencies.local).toBe("file:../local-package");
			expect(updated.dependencies.linked).toBe("link:../linked-package");
			expect(updated.dependencies.github).toBe(
				"git+https://github.com/user/repo.git",
			);
		});
	});

	describe("dry-run mode", () => {
		it("does not modify package.json in dry-run mode", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					debug: "^4.4.1",
				},
			};
			const originalContent = JSON.stringify(packageJson, null, "\t");
			await writeFile(join(tmpDir, "package.json"), originalContent);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							debug: { version: "4.4.3" },
						},
					},
				]),
			);

			// Run without --execute flag (dry-run by default)
			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir]);
			});

			expect(stdout).toContain("🔍 DRY RUN:");
			expect(stdout).toContain("Updated 1 package.json file(s)");
			expect(stdout).toContain("💡 Run with --execute to apply changes");

			// package.json should remain unchanged
			const content = await readFile(join(tmpDir, "package.json"), "utf-8");
			expect(content).toBe(originalContent);
		});
	});

	describe("devDependencies", () => {
		it("syncs devDependencies as well as dependencies", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				dependencies: {
					debug: "^4.4.1",
				},
				devDependencies: {
					vitest: "^3.2.1",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							debug: { version: "4.4.3" },
						},
						devDependencies: {
							vitest: { version: "3.2.4" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			expect(stdout).toContain("debug");
			expect(stdout).toContain("vitest");
			expect(stdout).toContain("dev"); // devDependencies prefix

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.dependencies.debug).toBe("^4.4.3");
			expect(updated.devDependencies.vitest).toBe("^3.2.4");
		});
	});

	describe("peerDependencies and optionalDependencies", () => {
		it("syncs peerDependencies", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				peerDependencies: {
					react: "^18.0.0",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						peerDependencies: {
							react: { version: "18.2.0" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			expect(stdout).toContain("react");
			expect(stdout).toContain("peer"); // peerDependencies prefix

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.peerDependencies.react).toBe("^18.2.0");
		});

		it("syncs optionalDependencies", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");

			const packageJson = {
				name: "test-package",
				version: "1.0.0",
				optionalDependencies: {
					fsevents: "^2.3.2",
				},
			};
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify(packageJson, null, "\t"),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						optionalDependencies: {
							fsevents: { version: "2.3.3" },
						},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--execute"]);
			});

			expect(stdout).toContain("fsevents");
			expect(stdout).toContain("opt"); // optionalDependencies prefix

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.optionalDependencies.fsevents).toBe("^2.3.3");
		});
	});

	describe("flags", () => {
		it("accepts --lockfile flag", async () => {
			const customLockfile = join(tmpDir, "pnpm-lock.yaml");
			await writeFile(customLockfile, "lockfileVersion: '9.0'");
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--lockfile", customLockfile]);
			});

			expect(stdout).toContain("🔄 Syncing package.json versions to lockfile");
		});

		it("accepts --package-manager flag", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--package-manager", "pnpm"]);
			});

			expect(stdout).toContain("🔄 Syncing package.json versions to lockfile");
		});

		it("supports --quiet flag", async () => {
			await writeFile(join(tmpDir, "pnpm-lock.yaml"), "lockfileVersion: '9.0'");
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			vi.mocked(execSync).mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {},
					},
				]),
			);

			const { stdout } = await captureOutput(async () => {
				await DepsSync.run(["--cwd", tmpDir, "--quiet"]);
			});

			// Quiet mode should still show the main message
			expect(stdout).toContain("🔄 Syncing package.json versions to lockfile");
			// But should not show verbose logs
			expect(stdout).not.toContain("Detected package manager");
			expect(stdout).not.toContain("Found");
		});
	});
});

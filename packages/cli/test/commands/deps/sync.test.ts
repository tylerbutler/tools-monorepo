import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { temporaryDirectory } from "tempy";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import DepsSync from "../../../src/commands/deps/sync.js";

describe("deps sync", () => {
	let tmpDir: string;

	beforeEach(() => {
		tmpDir = temporaryDirectory();
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

			const command = new DepsSync(["--cwd", tmpDir], {} as any);

			// Mock execSync to return empty project list
			const mockExecSync = vi.fn().mockReturnValue(JSON.stringify([]));
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			await expect(command.run()).resolves.toBeUndefined();
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

			const command = new DepsSync(["--cwd", tmpDir], {} as any);

			// Mock execSync to return empty project list
			const mockExecSync = vi.fn().mockReturnValue(
				JSON.stringify({
					name: "test-package",
					dependencies: {},
					devDependencies: {},
				}),
			);
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			await expect(command.run()).resolves.toBeUndefined();
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

			const command = new DepsSync(["--cwd", tmpDir], {} as any);

			await expect(command.run()).rejects.toThrow(
				"No lockfile found. Supported: pnpm-lock.yaml, package-lock.json",
			);
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

			const command = new DepsSync(["--cwd", tmpDir], {} as any);

			await expect(command.run()).rejects.toThrow("Yarn is not yet supported");
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
			const mockExecSync = vi.fn().mockReturnValue(
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
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(["--cwd", tmpDir, "--execute"], {} as any);
			await command.run();

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

			const mockExecSync = vi.fn().mockReturnValue(
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
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(["--cwd", tmpDir, "--execute"], {} as any);
			await command.run();

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

			const mockExecSync = vi.fn().mockReturnValue(
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
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(["--cwd", tmpDir, "--execute"], {} as any);
			await command.run();

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

			const mockExecSync = vi.fn().mockReturnValue(
				JSON.stringify([
					{
						name: "test-package",
						path: tmpDir,
						dependencies: {
							"@tylerbu/cli-api": { version: "1.0.0" },
						},
					},
				]),
			);
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(["--cwd", tmpDir, "--execute"], {} as any);
			await command.run();

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

			const mockExecSync = vi.fn().mockReturnValue(
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
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(["--cwd", tmpDir, "--execute"], {} as any);
			await command.run();

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

			const mockExecSync = vi.fn().mockReturnValue(
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
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			// Run without --execute flag (dry-run by default)
			const command = new DepsSync(["--cwd", tmpDir], {} as any);
			await command.run();

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

			const mockExecSync = vi.fn().mockReturnValue(
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
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(["--cwd", tmpDir, "--execute"], {} as any);
			await command.run();

			const updatedContent = await readFile(
				join(tmpDir, "package.json"),
				"utf-8",
			);
			const updated = JSON.parse(updatedContent);

			expect(updated.dependencies.debug).toBe("^4.4.3");
			expect(updated.devDependencies.vitest).toBe("^3.2.4");
		});
	});

	describe("flags", () => {
		it("accepts --lockfile flag", async () => {
			const customLockfile = join(tmpDir, "custom-lock.yaml");
			await writeFile(customLockfile, "lockfileVersion: '9.0'");
			await writeFile(
				join(tmpDir, "package.json"),
				JSON.stringify({
					name: "test-package",
					version: "1.0.0",
					dependencies: {},
				}),
			);

			const mockExecSync = vi.fn().mockReturnValue(JSON.stringify([]));
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(
				["--cwd", tmpDir, "--lockfile", customLockfile],
				{} as any,
			);

			await expect(command.run()).resolves.toBeUndefined();
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

			const mockExecSync = vi.fn().mockReturnValue(JSON.stringify([]));
			vi.doMock("node:child_process", () => ({
				execSync: mockExecSync,
			}));

			const command = new DepsSync(
				["--cwd", tmpDir, "--package-manager", "pnpm"],
				{} as any,
			);

			await expect(command.run()).resolves.toBeUndefined();
		});
	});
});

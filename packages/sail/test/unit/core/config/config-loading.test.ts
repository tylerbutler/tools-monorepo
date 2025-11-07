import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getSailConfig } from "../../../../src/core/config.js";
import type { ISailConfig } from "../../../../src/core/sailConfig.js";

describe("Config Loading (lilconfig migration)", () => {
	let testDir: string;

	beforeEach(async () => {
		// Create a unique temporary directory for each test
		testDir = join(tmpdir(), `sail-config-test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		// Clean up test directory
		await rm(testDir, { recursive: true, force: true });
	});

	describe("getSailConfig", () => {
		it("should load config from sail.config.cjs", async () => {
			const config: ISailConfig = {
				version: 1,
				tasks: {
					build: {
						dependsOn: ["^build"],
						script: true,
					},
				},
			};

			await writeFile(
				join(testDir, "sail.config.cjs"),
				`module.exports = ${JSON.stringify(config, null, 2)};`,
			);

			const result = getSailConfig(testDir);

			expect(result.config).toBeDefined();
			expect(result.config.version).toBe(1);
			expect(result.config.tasks).toBeDefined();
			expect(result.config.tasks?.build).toBeDefined();
			expect(result.configFilePath).toContain("sail.config.cjs");
		});

		it("should load config from fluidBuild.config.cjs as fallback", async () => {
			const config: ISailConfig = {
				version: 1,
				tasks: {
					test: {
						dependsOn: ["build"],
						script: true,
					},
				},
			};

			await writeFile(
				join(testDir, "fluidBuild.config.cjs"),
				`module.exports = ${JSON.stringify(config, null, 2)};`,
			);

			const result = getSailConfig(testDir);

			expect(result.config).toBeDefined();
			expect(result.config.version).toBe(1);
			expect(result.config.tasks?.test).toBeDefined();
			expect(result.configFilePath).toContain("fluidBuild.config.cjs");
		});

		it("should prefer sail.config.cjs over fluidBuild.config.cjs", async () => {
			const sailConfig: ISailConfig = {
				version: 1,
				tasks: {
					build: {
						dependsOn: ["^build"],
						script: true,
					},
				},
			};

			const fluidConfig: ISailConfig = {
				version: 1,
				tasks: {
					test: {
						dependsOn: ["build"],
						script: true,
					},
				},
			};

			await writeFile(
				join(testDir, "sail.config.cjs"),
				`module.exports = ${JSON.stringify(sailConfig, null, 2)};`,
			);
			await writeFile(
				join(testDir, "fluidBuild.config.cjs"),
				`module.exports = ${JSON.stringify(fluidConfig, null, 2)};`,
			);

			const result = getSailConfig(testDir);

			expect(result.configFilePath).toContain("sail.config.cjs");
			expect(result.config.tasks?.build).toBeDefined();
			expect(result.config.tasks?.test).toBeUndefined();
		});

		it("should throw error when no config is found", () => {
			expect(() => getSailConfig(testDir)).toThrow("No sail configuration found");
		});

		it("should throw error for unsupported config version", async () => {
			const config = {
				version: 999,
				tasks: {},
			};

			await writeFile(
				join(testDir, "sail.config.cjs"),
				`module.exports = ${JSON.stringify(config, null, 2)};`,
			);

			expect(() => getSailConfig(testDir)).toThrow(
				"Configuration version is not supported: 999",
			);
		});

		it("should support noCache parameter", async () => {
			// This test verifies the noCache parameter exists and can be called
			// Note: lilconfig's internal caching behavior may differ from cosmiconfig
			const config: ISailConfig = {
				version: 1,
				tasks: {
					build: {
						dependsOn: ["^build"],
						script: true,
					},
				},
			};

			await writeFile(
				join(testDir, "sail.config.cjs"),
				`module.exports = ${JSON.stringify(config, null, 2)};`,
			);

			// Verify noCache parameter can be used
			const resultWithoutCache = getSailConfig(testDir, false);
			expect(resultWithoutCache.config).toBeDefined();

			const resultWithCache = getSailConfig(testDir, true);
			expect(resultWithCache.config).toBeDefined();

			// Both should load the same config successfully
			expect(resultWithCache.config.tasks?.build).toBeDefined();
			expect(resultWithoutCache.config.tasks?.build).toBeDefined();
		});

		it("should add default version if missing and log warning", async () => {
			const config = {
				tasks: {
					build: {
						dependsOn: ["^build"],
						script: true,
					},
				},
			};

			await writeFile(
				join(testDir, "sail.config.cjs"),
				`module.exports = ${JSON.stringify(config, null, 2)};`,
			);

			const mockLogger = {
				warning: vi.fn(),
				info: vi.fn(),
				error: vi.fn(),
				verbose: vi.fn(),
			};

			const result = getSailConfig(testDir, false, mockLogger);

			expect(result.config.version).toBe(1);
			expect(mockLogger.warning).toHaveBeenCalledWith(
				expect.stringContaining("no version field"),
			);
		});

		it("should generate buildProject config if not present", async () => {
			const config: ISailConfig = {
				version: 1,
				tasks: {
					build: {
						dependsOn: ["^build"],
						script: true,
					},
				},
			};

			await writeFile(
				join(testDir, "sail.config.cjs"),
				`module.exports = ${JSON.stringify(config, null, 2)};`,
			);

			// Create a minimal package.json for buildProject generation
			await writeFile(
				join(testDir, "package.json"),
				JSON.stringify({ name: "test-project", version: "1.0.0" }, null, 2),
			);

			const result = getSailConfig(testDir);

			expect(result.config.buildProject).toBeDefined();
		});
	});
});

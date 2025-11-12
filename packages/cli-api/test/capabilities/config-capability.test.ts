import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Config } from "@oclif/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand } from "../../src/baseCommand.js";
import { ConfigCapability, useConfig } from "../../src/capabilities/config.js";

interface TestConfig {
	name: string;
	value: number;
}

class TestCommand extends BaseCommand<typeof TestCommand> {
	public static override readonly description = "Test command";
	public errorSpy = vi.fn();

	public override error(
		message: string | Error,
		options?: { exit: number },
	): never {
		this.errorSpy(message, options);
		throw new Error(message.toString());
	}
}

describe("ConfigCapability", () => {
	let command: TestCommand;
	let mockConfig: Config;
	let tempDir: string;

	beforeEach(() => {
		mockConfig = {
			root: "/test/root",
			bin: "test-cli",
			version: "1.0.0",
			pjson: {} as any,
		} as Config;

		command = new TestCommand([], mockConfig);
		tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "config-test-"));
	});

	afterEach(() => {
		// Clean up temp directory
		if (fs.existsSync(tempDir)) {
			fs.rmSync(tempDir, { recursive: true, force: true });
		}
	});

	describe("with config file present", () => {
		it("should load config from file", async () => {
			// loadConfig looks for ${bin}.config.(ts|mjs|cjs)
			const configPath = path.join(tempDir, "test-cli.config.cjs");
			const testConfig: TestConfig = { name: "test", value: 42 };
			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(testConfig)};`,
			);

			const capability = new ConfigCapability<TestConfig>({
				searchPaths: [tempDir],
				required: true,
			});

			const result = await capability.initialize(command);

			expect(result.config).toEqual(testConfig);
			expect(result.location).toBe(configPath);
			expect(result.isDefault()).toBe(false);
		});

		it.skip("should support config reload", async () => {
			// TODO: Module caching prevents reload from working properly
			// Need to investigate how to clear Node.js module cache or use a different approach
			const configPath = path.join(tempDir, "test-cli.config.cjs");
			const testConfig: TestConfig = { name: "test", value: 42 };
			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(testConfig)};`,
			);

			const capability = new ConfigCapability<TestConfig>({
				searchPaths: [tempDir],
				required: true,
			});

			const result = await capability.initialize(command);
			expect(result.config.value).toBe(42);

			// Modify config file
			const updatedConfig: TestConfig = { name: "test", value: 99 };
			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(updatedConfig)};`,
			);

			// Reload
			const reloaded = await result.reload();
			expect(reloaded.config.value).toBe(99);
			expect(reloaded.location).toBe(configPath);
		});
	});

	describe("with default config", () => {
		it("should use default config when file not found", async () => {
			const defaultConfig: TestConfig = { name: "default", value: 0 };

			const capability = new ConfigCapability<TestConfig>({
				searchPaths: [tempDir],
				defaultConfig,
				required: false,
			});

			const result = await capability.initialize(command);

			expect(result.config).toEqual(defaultConfig);
			expect(result.location).toBe("DEFAULT");
			expect(result.isDefault()).toBe(true);
		});

		it("should prefer file config over default", async () => {
			const configPath = path.join(tempDir, "test-cli.config.cjs");
			const fileConfig: TestConfig = { name: "file", value: 42 };
			const defaultConfig: TestConfig = { name: "default", value: 0 };

			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(fileConfig)};`,
			);

			const capability = new ConfigCapability<TestConfig>({
				searchPaths: [tempDir],
				defaultConfig,
				required: false,
			});

			const result = await capability.initialize(command);

			expect(result.config).toEqual(fileConfig);
			expect(result.isDefault()).toBe(false);
		});
	});

	describe("error handling", () => {
		it("should error when config required but not found", async () => {
			const capability = new ConfigCapability<TestConfig>({
				searchPaths: [tempDir],
				required: true,
			});

			await expect(capability.initialize(command)).rejects.toThrow();
			expect(command.errorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Could not find config file"),
				{ exit: 1 },
			);
		});

		it("should not error when config optional and not found", async () => {
			const capability = new ConfigCapability<TestConfig>({
				searchPaths: [tempDir],
				required: false,
			});

			const result = await capability.initialize(command);

			expect(result.config).toBeUndefined();
			expect(result.location).toBeUndefined();
			expect(result.isDefault()).toBe(false);
		});
	});

	describe("useConfig helper", () => {
		it("should create capability holder with config capability", async () => {
			const configPath = path.join(tempDir, "test-cli.config.cjs");
			const testConfig: TestConfig = { name: "test", value: 42 };
			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(testConfig)};`,
			);

			const holder = useConfig<TestConfig>(command, {
				searchPaths: [tempDir],
				required: true,
			});

			expect(holder.isInitialized).toBe(false);

			const result = await holder.get();

			expect(holder.isInitialized).toBe(true);
			expect(result.config).toEqual(testConfig);
		});

		it("should work with default config", async () => {
			const defaultConfig: TestConfig = { name: "default", value: 0 };

			const holder = useConfig<TestConfig>(command, {
				searchPaths: [tempDir],
				defaultConfig,
				required: false,
			});

			const result = await holder.get();

			expect(result.config).toEqual(defaultConfig);
			expect(result.isDefault()).toBe(true);
		});
	});

	describe("custom search paths", () => {
		it("should search in multiple paths", async () => {
			const dir1 = path.join(tempDir, "dir1");
			const dir2 = path.join(tempDir, "dir2");
			fs.mkdirSync(dir1);
			fs.mkdirSync(dir2);

			const configPath = path.join(dir2, "test-cli.config.cjs");
			const testConfig: TestConfig = { name: "test", value: 42 };
			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(testConfig)};`,
			);

			const capability = new ConfigCapability<TestConfig>({
				searchPaths: [dir1, dir2],
				required: true,
			});

			const result = await capability.initialize(command);

			expect(result.config).toEqual(testConfig);
			expect(result.location).toBe(configPath);
		});
	});
});

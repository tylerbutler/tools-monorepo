import fs from "node:fs";
import os from "node:os";
import type { Config } from "@oclif/core";
import path from "pathe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand } from "../../src/baseCommand.js";
import { useConfig } from "../../src/capabilities/config.js";

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
			// biome-ignore lint/suspicious/noExplicitAny: Test config mock requires partial Config object
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

			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				required: true,
			});

			const result = await holder.get();

			expect(result.found).toBe(true);
			expect(result.config).toEqual(testConfig);
			expect(result.location).toBe(configPath);
			expect(result.isDefault).toBe(false);
		});
	});

	describe("with default config", () => {
		it("should use default config when file not found", async () => {
			const defaultConfig: TestConfig = { name: "default", value: 0 };

			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				defaultConfig,
				required: false,
			});

			const result = await holder.get();

			expect(result.found).toBe(true);
			if (result.found) {
				expect(result.config).toEqual(defaultConfig);
				expect(result.location).toBe("DEFAULT");
				expect(result.isDefault).toBe(true);
			}
		});

		it("should prefer file config over default", async () => {
			const configPath = path.join(tempDir, "test-cli.config.cjs");
			const fileConfig: TestConfig = { name: "file", value: 42 };
			const defaultConfig: TestConfig = { name: "default", value: 0 };

			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(fileConfig)};`,
			);

			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				defaultConfig,
				required: false,
			});

			const result = await holder.get();

			expect(result.found).toBe(true);
			if (result.found) {
				expect(result.config).toEqual(fileConfig);
				expect(result.isDefault).toBe(false);
			}
		});
	});

	describe("error handling", () => {
		it("should error when config required but not found", async () => {
			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				required: true,
			});

			await expect(holder.get()).rejects.toThrow();
			expect(command.errorSpy).toHaveBeenCalledTimes(1);
			expect(command.errorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Could not find config file"),
				{ exit: 1 },
			);
		});

		it("should not error when config optional and not found", async () => {
			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				required: false,
			});

			const result = await holder.get();

			expect(result.found).toBe(false);
			if (!result.found) {
				expect(result.config).toBeUndefined();
				expect(result.location).toBeUndefined();
				expect(result.isDefault).toBe(false);
			}
		});
	});

	describe("useConfig helper", () => {
		it("should create lazy capability with config", async () => {
			const configPath = path.join(tempDir, "test-cli.config.cjs");
			const testConfig: TestConfig = { name: "test", value: 42 };
			fs.writeFileSync(
				configPath,
				`module.exports = ${JSON.stringify(testConfig)};`,
			);

			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				required: true,
			});

			expect(holder.isInitialized).toBe(false);

			const result = await holder.get();

			expect(holder.isInitialized).toBe(true);
			expect(result.found).toBe(true);
			expect(result.config).toEqual(testConfig);
		});

		it("should work with default config", async () => {
			const defaultConfig: TestConfig = { name: "default", value: 0 };

			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				defaultConfig,
				required: false,
			});

			const result = await holder.get();

			expect(result.found).toBe(true);
			if (result.found) {
				expect(result.config).toEqual(defaultConfig);
				expect(result.isDefault).toBe(true);
			}
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

			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [dir1, dir2],
				required: true,
			});

			const result = await holder.get();

			expect(result.found).toBe(true);
			expect(result.config).toEqual(testConfig);
			expect(result.location).toBe(configPath);
		});

		it("should return the first matching path when config exists in multiple paths", async () => {
			const dir1 = path.join(tempDir, "dir1");
			const dir2 = path.join(tempDir, "dir2");
			fs.mkdirSync(dir1);
			fs.mkdirSync(dir2);

			const firstConfig: TestConfig = { name: "first", value: 1 };
			const secondConfig: TestConfig = { name: "second", value: 2 };

			fs.writeFileSync(
				path.join(dir1, "test-cli.config.cjs"),
				`module.exports = ${JSON.stringify(firstConfig)};`,
			);
			fs.writeFileSync(
				path.join(dir2, "test-cli.config.cjs"),
				`module.exports = ${JSON.stringify(secondConfig)};`,
			);

			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [dir1, dir2],
				required: true,
			});

			const result = await holder.get();

			expect(result.found).toBe(true);
			expect(result.config).toEqual(firstConfig);
		});
	});

	describe("defaultConfig behavior", () => {
		it("should use defaultConfig when required:true but no file found", async () => {
			const defaultConfig: TestConfig = { name: "default", value: 0 };

			// required:true + defaultConfig + no file → uses defaultConfig (does NOT error)
			const holder = useConfig<typeof command, TestConfig>(command, {
				searchPaths: [tempDir],
				defaultConfig,
				required: true,
			});

			const result = await holder.get();

			expect(result.found).toBe(true);
			expect(result.config).toEqual(defaultConfig);
			expect(result.isDefault).toBe(true);
			expect(command.errorSpy).not.toHaveBeenCalled();
		});
	});
});

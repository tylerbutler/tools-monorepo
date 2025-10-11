import path from "pathe";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/loadConfig.ts";
import { type TestConfigSchema, testDataPath } from "./common.ts";

describe("loadConfig", () => {
	const configPath = path.join(testDataPath, "configs");

	it("returns undefined when no file found", async () => {
		const result = await loadConfig<TestConfigSchema>(
			"missing",
			configPath,
			testDataPath,
		);
		expect(result).toBeUndefined();
	});

	it("loads config from TypeScript file", async () => {
		const result = await loadConfig<TestConfigSchema>(
			"test-module-ts",
			configPath,
			testDataPath,
		);
		expect(result?.config).not.toBeUndefined();
		expect(result?.config.stringProperty).toEqual("stringValue");
		expect(result?.location).toEqual(
			path.join(configPath, "test-module-ts.config.ts"),
		);
	});

	it("loads config from CommonJS file", async () => {
		const result = await loadConfig<TestConfigSchema>(
			"test-module-cjs",
			configPath,
			testDataPath,
		);
		expect(result?.config).not.toBeUndefined();
		expect(result?.config.stringProperty).toEqual("stringValue");
		expect(result?.location).toEqual(
			path.join(configPath, "test-module-cjs.config.cjs"),
		);
	});

	it("loads config from ESM file", async () => {
		const result = await loadConfig<TestConfigSchema>(
			"test-module-esm",
			configPath,
			testDataPath,
		);
		expect(result?.config).not.toBeUndefined();
		expect(result?.config.stringProperty).toEqual("stringValue");
		expect(result?.location).toEqual(
			path.join(configPath, "test-module-esm.config.mjs"),
		);
	});

	describe("nested loading", () => {
		const level2Dir = path.join(configPath, "nested/level2");

		it("loads higher-level config in lower path", async () => {
			const result = await loadConfig<TestConfigSchema>(
				"test-module-ts",
				level2Dir,
				testDataPath,
			);
			expect(result?.config).not.toBeUndefined();
			expect(result?.config.stringProperty).toEqual("stringValue");
			expect(result?.location).toEqual(
				path.join(configPath, "test-module-ts.config.ts"),
			);
		});

		it("stops at stopDir when provided", async () => {
			const result = await loadConfig<TestConfigSchema>(
				"test-module-ts",
				level2Dir,
				path.join(configPath, "nested"),
			);
			expect(result).toBeUndefined();
		});
	});
});

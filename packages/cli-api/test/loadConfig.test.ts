import path from "pathe";
import { describe, expect, it } from "vitest";

import { loadConfig } from "../src/loadConfig.js";
import { type TestConfigSchema, testDataPath } from "./common.js";

describe("loadConfig", () => {
	it("loads config from typescript file", async () => {
		const configPath = path.join(testDataPath, "configs");

		const result = await loadConfig<TestConfigSchema>(
			"testModule",
			configPath,
			testDataPath,
		);
		expect(result?.config).not.toBeUndefined();
		expect(result?.config.stringProperty).toEqual("stringValue");
		expect(result?.filepath).toEqual(
			path.join(configPath, "testModule.config.ts"),
		);
	});

	it("loads config from CommonJS file", async () => {
		const configPath = path.join(testDataPath, "configs");

		const result = await loadConfig<TestConfigSchema>(
			"testModule-cjs",
			configPath,
			testDataPath,
		);
		expect(result?.config).not.toBeUndefined();
		expect(result?.config.stringProperty).toEqual("stringValue");
		expect(result?.filepath).toEqual(
			path.join(configPath, "testModule-cjs.config.cjs"),
		);
	});

	it("loads config from ESM file", async () => {
		const configPath = path.join(testDataPath, "configs");

		const result = await loadConfig<TestConfigSchema>(
			"testModule-esm",
			configPath,
			testDataPath,
		);
		expect(result?.config).not.toBeUndefined();
		expect(result?.config.stringProperty).toEqual("stringValue");
		expect(result?.filepath).toEqual(
			path.join(configPath, "testModule-esm.config.mjs"),
		);
	});

	it("fails when no file found", async () => {
		const configPath = path.join(testDataPath, "configs");

		const result = await loadConfig<TestConfigSchema>(
			"missing",
			configPath,
			testDataPath,
		);
		expect(result?.config).toBeUndefined();
	});
});

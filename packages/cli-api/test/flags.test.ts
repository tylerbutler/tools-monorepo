import { describe, expect, it } from "vitest";

import {
	ConfigFileFlag,
	ConfigFileFlagHidden,
	RegExpFlag,
} from "../src/flags.js";

describe("RegExpFlag", () => {
	it("is a function that returns a flag definition", () => {
		const flag = RegExpFlag();
		expect(flag.parse).toBeDefined();
		expect(typeof flag.parse).toBe("function");
	});

	it("creates a case-insensitive RegExp from string input", async () => {
		const flag = RegExpFlag();
		const result = await flag.parse("test", {} as never, {} as never);
		expect(result).toBeInstanceOf(RegExp);
		expect(result.flags).toContain("i");
		expect(result.source).toBe("test");
	});

	it("matches strings case-insensitively", async () => {
		const flag = RegExpFlag();
		const regex = await flag.parse("hello", {} as never, {} as never);
		expect(regex.test("HELLO")).toBe(true);
		expect(regex.test("Hello")).toBe(true);
		expect(regex.test("hello")).toBe(true);
	});

	it("handles regex special characters", async () => {
		const flag = RegExpFlag();
		const regex = await flag.parse("test.*pattern", {} as never, {} as never);
		expect(regex.test("test123pattern")).toBe(true);
		expect(regex.test("testXYZpattern")).toBe(true);
	});

	it("handles complex regex patterns", async () => {
		const flag = RegExpFlag();
		const regex = await flag.parse("^start.*end$", {} as never, {} as never);
		expect(regex.test("start something end")).toBe(true);
		expect(regex.test("start end")).toBe(true);
		expect(regex.test("not start end")).toBe(false);
	});

	it("creates regex with case-insensitive flag", async () => {
		const flag = RegExpFlag();
		const regex = await flag.parse("abc", {} as never, {} as never);
		expect(regex.flags).toBe("i");
	});
});

describe("ConfigFileFlag", () => {
	it("has correct description", () => {
		expect(ConfigFileFlag.description).toBe(
			"The path to a configuration file.",
		);
	});

	it("is in CONFIGURATION help group", () => {
		expect(ConfigFileFlag.helpGroup).toBe("CONFIGURATION");
	});

	it("requires file to exist", () => {
		// The exists property should be set to true
		expect((ConfigFileFlag as { exists?: boolean }).exists).toBe(true);
	});

	it("is not hidden by default", () => {
		// Hidden should be undefined or false
		expect((ConfigFileFlag as { hidden?: boolean }).hidden).toBeFalsy();
	});

	it("is a file type flag", () => {
		// File flags have a parse function and type
		expect(ConfigFileFlag.parse).toBeDefined();
		expect(typeof ConfigFileFlag.parse).toBe("function");
	});
});

describe("ConfigFileFlagHidden", () => {
	it("has correct description", () => {
		expect(ConfigFileFlagHidden.description).toBe(
			"The path to a configuration file.",
		);
	});

	it("is in CONFIGURATION help group", () => {
		expect(ConfigFileFlagHidden.helpGroup).toBe("CONFIGURATION");
	});

	it("requires file to exist", () => {
		expect((ConfigFileFlagHidden as { exists?: boolean }).exists).toBe(true);
	});

	it("is hidden from help output", () => {
		expect((ConfigFileFlagHidden as { hidden?: boolean }).hidden).toBe(true);
	});

	it("is a file type flag", () => {
		expect(ConfigFileFlagHidden.parse).toBeDefined();
		expect(typeof ConfigFileFlagHidden.parse).toBe("function");
	});

	it("has same configuration as ConfigFileFlag except hidden", () => {
		// Should have same description
		expect(ConfigFileFlagHidden.description).toBe(ConfigFileFlag.description);
		// Should have same help group
		expect(ConfigFileFlagHidden.helpGroup).toBe(ConfigFileFlag.helpGroup);
		// Should have same exists requirement
		expect((ConfigFileFlagHidden as { exists?: boolean }).exists).toBe(
			(ConfigFileFlag as { exists?: boolean }).exists,
		);
		// Should differ only in hidden property
		expect((ConfigFileFlagHidden as { hidden?: boolean }).hidden).not.toBe(
			(ConfigFileFlag as { hidden?: boolean }).hidden,
		);
	});
});

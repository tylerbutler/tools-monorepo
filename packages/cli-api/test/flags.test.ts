import { describe, expect, it } from "vitest";

import { ConfigFlag, ConfigFlagHidden, RegExpFlag } from "../src/flags.js";

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

describe("ConfigFlag", () => {
	it("has correct description", () => {
		expect(ConfigFlag.description).toBe("Path to configuration file.");
	});

	it("has -c shorthand", () => {
		expect(ConfigFlag.char).toBe("c");
	});

	it("is in CONFIGURATION help group", () => {
		expect(ConfigFlag.helpGroup).toBe("CONFIGURATION");
	});

	it("requires file to exist", () => {
		expect((ConfigFlag as { exists?: boolean }).exists).toBe(true);
	});

	it("is not hidden by default", () => {
		expect((ConfigFlag as { hidden?: boolean }).hidden).toBeFalsy();
	});

	it("is a file type flag", () => {
		expect(ConfigFlag.parse).toBeDefined();
		expect(typeof ConfigFlag.parse).toBe("function");
	});
});

describe("ConfigFlagHidden", () => {
	it("has correct description", () => {
		expect(ConfigFlagHidden.description).toBe("Path to configuration file.");
	});

	it("has -c shorthand", () => {
		expect(ConfigFlagHidden.char).toBe("c");
	});

	it("is in CONFIGURATION help group", () => {
		expect(ConfigFlagHidden.helpGroup).toBe("CONFIGURATION");
	});

	it("requires file to exist", () => {
		expect((ConfigFlagHidden as { exists?: boolean }).exists).toBe(true);
	});

	it("is hidden from help output", () => {
		expect((ConfigFlagHidden as { hidden?: boolean }).hidden).toBe(true);
	});

	it("is a file type flag", () => {
		expect(ConfigFlagHidden.parse).toBeDefined();
		expect(typeof ConfigFlagHidden.parse).toBe("function");
	});

	it("has same configuration as ConfigFlag except hidden", () => {
		expect(ConfigFlagHidden.description).toBe(ConfigFlag.description);
		expect(ConfigFlagHidden.char).toBe(ConfigFlag.char);
		expect(ConfigFlagHidden.helpGroup).toBe(ConfigFlag.helpGroup);
		expect((ConfigFlagHidden as { exists?: boolean }).exists).toBe(
			(ConfigFlag as { exists?: boolean }).exists,
		);
		expect((ConfigFlagHidden as { hidden?: boolean }).hidden).not.toBe(
			(ConfigFlag as { hidden?: boolean }).hidden,
		);
	});
});

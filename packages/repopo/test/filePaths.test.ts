import { describe, expect, it } from "vitest";
import { normalizeFilePathInput } from "../src/filePaths.js";

describe("normalizeFilePathInput", () => {
	it("removes the empty record from a trailing newline", () => {
		expect(normalizeFilePathInput("src/a.ts\nsrc/b.ts\n")).toEqual([
			"src/a.ts",
			"src/b.ts",
		]);
	});

	it("returns no paths for empty input", () => {
		expect(normalizeFilePathInput("")).toEqual([]);
	});

	it("normalizes Windows separators and line endings", () => {
		expect(normalizeFilePathInput("src\\a.ts\r\nsrc\\b.ts\r\n")).toEqual([
			"src/a.ts",
			"src/b.ts",
		]);
	});
});

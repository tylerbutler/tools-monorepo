import { describe, expect, it } from "vitest";

import { parseFilePaths } from "../src/filePaths.js";

describe("parseFilePaths", () => {
	it("returns an empty array for empty input", () => {
		expect(parseFilePaths("")).toEqual([]);
	});

	it("drops a trailing LF", () => {
		expect(parseFilePaths("packages/repopo/src/index.ts\n")).toEqual([
			"packages/repopo/src/index.ts",
		]);
	});

	it("drops a trailing CRLF", () => {
		expect(parseFilePaths("packages/repopo/src/index.ts\r\n")).toEqual([
			"packages/repopo/src/index.ts",
		]);
	});

	it("parses NUL-delimited file paths", () => {
		expect(
			parseFilePaths(
				"packages/repopo/src\n/index.ts\0packages/repopo/test/index.ts\0",
			),
		).toEqual([
			"packages/repopo/src\n/index.ts",
			"packages/repopo/test/index.ts",
		]);
	});

	it("removes blank records and normalizes Windows separators", () => {
		expect(
			parseFilePaths(
				"packages\\repopo\\src\\index.ts\r\n\r\npackages\\repopo\\test\\index.ts",
			),
		).toEqual([
			"packages/repopo/src/index.ts",
			"packages/repopo/test/index.ts",
		]);
	});
});

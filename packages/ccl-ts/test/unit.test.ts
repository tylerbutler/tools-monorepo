/**
 * Unit tests for ccl-ts functions.
 *
 * These tests cover edge cases and code paths that may not be covered
 * by the data-driven ccl-test-data suite.
 */

import { describe, expect, it } from "vitest";
import {
	buildHierarchy,
	canonicalFormat,
	getFloat,
	getList,
	parse,
} from "../src/ccl.js";

describe("getFloat", () => {
	it("should return error for empty string value", () => {
		const parseResult = parse("ratio=");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getFloat(objResult.value, "ratio");
		expect(result.isErr).toBe(true);
		if (result.isErr) {
			expect(result.error.message).toContain("empty");
		}
	});

	it("should return error for whitespace-only value", () => {
		const parseResult = parse("ratio=   ");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getFloat(objResult.value, "ratio");
		expect(result.isErr).toBe(true);
		if (result.isErr) {
			expect(result.error.message).toContain("empty");
		}
	});

	it("should parse valid float from value with whitespace", () => {
		const parseResult = parse("ratio=  3.14  ");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getFloat(objResult.value, "ratio");
		expect(result.isOk).toBe(true);
		if (result.isOk) {
			expect(result.value).toBe(3.14);
		}
	});
});

describe("getList", () => {
	it("should return direct array from duplicate keys", () => {
		const parseResult = parse("colors=red\ncolors=green\ncolors=blue");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getList(objResult.value, "colors");
		expect(result.isOk).toBe(true);
		if (result.isOk) {
			expect(result.value).toEqual(["red", "green", "blue"]);
		}
	});

	it("should return list from bare list syntax (empty keys)", () => {
		const parseResult = parse("colors=\n  =red\n  =green\n  =blue");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getList(objResult.value, "colors");
		expect(result.isOk).toBe(true);
		if (result.isOk) {
			expect(result.value).toEqual(["red", "green", "blue"]);
		}
	});

	it("should return error for non-list value", () => {
		const parseResult = parse("name=Alice");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getList(objResult.value, "name");
		expect(result.isErr).toBe(true);
		if (result.isErr) {
			expect(result.error.message).toContain("not a list");
		}
	});

	it("should return error for object without empty-key list", () => {
		const parseResult = parse("server=\n  host=localhost");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getList(objResult.value, "server");
		expect(result.isErr).toBe(true);
		if (result.isErr) {
			expect(result.error.message).toContain("not a list");
		}
	});

	it("should return error for missing path", () => {
		const parseResult = parse("name=Alice");
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const objResult = buildHierarchy(parseResult.value);
		expect(objResult.isOk).toBe(true);
		if (!objResult.isOk) {
			return;
		}

		const result = getList(objResult.value, "missing");
		expect(result.isErr).toBe(true);
		if (result.isErr) {
			expect(result.error.message).toContain("Path not found");
		}
	});
});

describe("canonicalFormat", () => {
	it("should format array values (from duplicate keys)", () => {
		const input = "colors=red\ncolors=green\ncolors=blue";
		const result = canonicalFormat(input);
		expect(result.isOk).toBe(true);
		if (!result.isOk) {
			return;
		}

		// Arrays are output with each item on its own line with empty-key syntax
		expect(result.value).toContain("colors =");
		expect(result.value).toContain("red =");
		expect(result.value).toContain("green =");
		expect(result.value).toContain("blue =");
	});

	it("should format nested objects", () => {
		const input = "server=\n  host=localhost\n  port=8080";
		const result = canonicalFormat(input);
		expect(result.isOk).toBe(true);
		if (!result.isOk) {
			return;
		}

		expect(result.value).toContain("server =");
		expect(result.value).toContain("host =");
		expect(result.value).toContain("port =");
	});

	it("should sort keys alphabetically", () => {
		const input = "z=last\na=first\nm=middle";
		const result = canonicalFormat(input);
		expect(result.isOk).toBe(true);
		if (!result.isOk) {
			return;
		}

		// Keys should be sorted: a, m, z
		const aIndex = result.value.indexOf("a =");
		const mIndex = result.value.indexOf("m =");
		const zIndex = result.value.indexOf("z =");
		expect(aIndex).toBeLessThan(mIndex);
		expect(mIndex).toBeLessThan(zIndex);
	});

	it("should handle empty values", () => {
		const input = "empty=";
		const result = canonicalFormat(input);
		expect(result.isOk).toBe(true);
		if (!result.isOk) {
			return;
		}

		expect(result.value).toBe("empty =\n");
	});

	it("should handle deeply nested structures", () => {
		const input = "a=\n  b=\n    c=value";
		const result = canonicalFormat(input);
		expect(result.isOk).toBe(true);
		if (!result.isOk) {
			return;
		}

		expect(result.value).toContain("a =");
		expect(result.value).toContain("b =");
		expect(result.value).toContain("c =");
		expect(result.value).toContain("value =");
	});
});

describe("parse edge cases", () => {
	it("should handle empty input", () => {
		const result = parse("");
		expect(result.isOk).toBe(true);
		if (result.isOk) {
			expect(result.value).toEqual([]);
		}
	});

	it("should handle whitespace-only input", () => {
		const result = parse("   \n   \n   ");
		expect(result.isOk).toBe(true);
		if (result.isOk) {
			expect(result.value).toEqual([]);
		}
	});
});

describe("buildHierarchy edge cases", () => {
	it("should handle empty entries", () => {
		const result = buildHierarchy([]);
		expect(result.isOk).toBe(true);
		if (result.isOk) {
			expect(result.value).toEqual({});
		}
	});

	it("should merge nested objects with same key", () => {
		const parseResult = parse(
			"server=\n  host=localhost\nserver=\n  port=8080",
		);
		expect(parseResult.isOk).toBe(true);
		if (!parseResult.isOk) {
			return;
		}

		const result = buildHierarchy(parseResult.value);
		expect(result.isOk).toBe(true);
		if (result.isOk) {
			expect(result.value).toEqual({
				server: {
					host: "localhost",
					port: "8080",
				},
			});
		}
	});
});

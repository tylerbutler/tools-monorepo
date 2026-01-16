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
	it("should throw error for empty string value", () => {
		const obj = buildHierarchy(parse("ratio="));
		expect(() => getFloat(obj, "ratio")).toThrow(
			"Value at path 'ratio' is empty, cannot parse as float",
		);
	});

	it("should throw error for whitespace-only value", () => {
		const obj = buildHierarchy(parse("ratio=   "));
		expect(() => getFloat(obj, "ratio")).toThrow(
			"Value at path 'ratio' is empty, cannot parse as float",
		);
	});

	it("should parse valid float from value with whitespace", () => {
		const obj = buildHierarchy(parse("ratio=  3.14  "));
		expect(getFloat(obj, "ratio")).toBe(3.14);
	});
});

describe("getList", () => {
	it("should return direct array from duplicate keys", () => {
		const obj = buildHierarchy(parse("colors=red\ncolors=green\ncolors=blue"));
		const result = getList(obj, "colors");
		expect(result).toEqual(["red", "green", "blue"]);
	});

	it("should return list from bare list syntax (empty keys)", () => {
		const obj = buildHierarchy(parse("colors=\n  =red\n  =green\n  =blue"));
		const result = getList(obj, "colors");
		expect(result).toEqual(["red", "green", "blue"]);
	});

	it("should throw error for non-list value", () => {
		const obj = buildHierarchy(parse("name=Alice"));
		expect(() => getList(obj, "name")).toThrow(
			"Value at path 'name' is not a list (got string)",
		);
	});

	it("should throw error for object without empty-key list", () => {
		const obj = buildHierarchy(parse("server=\n  host=localhost"));
		expect(() => getList(obj, "server")).toThrow(
			"Value at path 'server' is not a list (got object)",
		);
	});

	it("should throw error for missing path", () => {
		const obj = buildHierarchy(parse("name=Alice"));
		expect(() => getList(obj, "missing")).toThrow("Path not found: missing");
	});
});

describe("canonicalFormat", () => {
	it("should format array values (from duplicate keys)", () => {
		const input = "colors=red\ncolors=green\ncolors=blue";
		const result = canonicalFormat(input);
		// Arrays are output with each item on its own line with empty-key syntax
		expect(result).toContain("colors =");
		expect(result).toContain("red =");
		expect(result).toContain("green =");
		expect(result).toContain("blue =");
	});

	it("should format nested objects", () => {
		const input = "server=\n  host=localhost\n  port=8080";
		const result = canonicalFormat(input);
		expect(result).toContain("server =");
		expect(result).toContain("host =");
		expect(result).toContain("port =");
	});

	it("should sort keys alphabetically", () => {
		const input = "z=last\na=first\nm=middle";
		const result = canonicalFormat(input);
		// Keys should be sorted: a, m, z
		const aIndex = result.indexOf("a =");
		const mIndex = result.indexOf("m =");
		const zIndex = result.indexOf("z =");
		expect(aIndex).toBeLessThan(mIndex);
		expect(mIndex).toBeLessThan(zIndex);
	});

	it("should handle empty values", () => {
		const input = "empty=";
		const result = canonicalFormat(input);
		expect(result).toBe("empty =\n");
	});

	it("should handle deeply nested structures", () => {
		const input = "a=\n  b=\n    c=value";
		const result = canonicalFormat(input);
		expect(result).toContain("a =");
		expect(result).toContain("b =");
		expect(result).toContain("c =");
		expect(result).toContain("value =");
	});
});

describe("parse edge cases", () => {
	it("should handle empty input", () => {
		const entries = parse("");
		expect(entries).toEqual([]);
	});

	it("should handle whitespace-only input", () => {
		const entries = parse("   \n   \n   ");
		expect(entries).toEqual([]);
	});
});

describe("buildHierarchy edge cases", () => {
	it("should handle empty entries", () => {
		const obj = buildHierarchy([]);
		expect(obj).toEqual({});
	});

	it("should merge nested objects with same key", () => {
		const entries = parse("server=\n  host=localhost\nserver=\n  port=8080");
		const obj = buildHierarchy(entries);
		expect(obj).toEqual({
			server: {
				host: "localhost",
				port: "8080",
			},
		});
	});
});

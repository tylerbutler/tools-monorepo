import { describe, expect, it } from "vitest";
import {
	buildHierarchy,
	getAllFunctions,
	getImplementedFunctions,
	parse,
	parseIndented,
	parseToObject,
} from "../../src/ccl.js";
import { NotYetImplementedError } from "../../src/errors.js";

describe("CCL Functions (Stub Implementations)", () => {
	it("parse should return a successful result", () => {
		const result = parse("key = value");
		expect(result.success).toBe(true);
	});

	it("parseIndented should throw NotYetImplementedError", () => {
		expect(() => parseIndented("key = value")).toThrow(NotYetImplementedError);
	});

	it("buildHierarchy should throw NotYetImplementedError", () => {
		expect(() => buildHierarchy([])).toThrow(NotYetImplementedError);
	});

	it("parseToObject should throw when buildHierarchy is not implemented", () => {
		// parseToObject calls parse then buildHierarchy
		// Since buildHierarchy throws NotYetImplementedError, parseToObject throws
		expect(() => parseToObject("key = value")).toThrow(NotYetImplementedError);
	});

	it("getImplementedFunctions should return parse", () => {
		const functions = getImplementedFunctions();
		expect(functions).toContain("parse");
		expect(functions).toHaveLength(1);
	});

	it("getAllFunctions should return all function names", () => {
		const functions = getAllFunctions();
		expect(functions).toContain("parse");
		expect(functions).toContain("parseIndented");
		expect(functions).toContain("buildHierarchy");
	});
});

describe("parse function", () => {
	describe("basic parsing", () => {
		it("should parse simple key = value", () => {
			const result = parse("key = value");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toEqual([{ key: "key", value: "value" }]);
			}
		});

		it("should parse multiple key-value pairs", () => {
			const result = parse("name = Alice\nage = 30");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(2);
				expect(result.entries[0]).toEqual({ key: "name", value: "Alice" });
				expect(result.entries[1]).toEqual({ key: "age", value: "30" });
			}
		});

		it("should handle empty input", () => {
			const result = parse("");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toEqual([]);
			}
		});

		it("should handle whitespace-only input", () => {
			const result = parse("   \n\n   ");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toEqual([]);
			}
		});
	});

	describe("key trimming", () => {
		it("should trim spaces from keys", () => {
			const result = parse("  key  = value");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries[0]?.key).toBe("key");
			}
		});

		it("should trim tabs from keys", () => {
			const result = parse("\tkey\t = value");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries[0]?.key).toBe("key");
			}
		});
	});

	describe("value handling", () => {
		it("should trim spaces but preserve leading tabs in values", () => {
			const result = parse("key =   \tvalue");
			expect(result.success).toBe(true);
			if (result.success) {
				// Leading tab is preserved, trailing spaces are trimmed
				expect(result.entries[0]?.value).toBe("\tvalue");
			}
		});

		it("should handle empty value after equals", () => {
			const result = parse("key =");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries[0]?.value).toBe("");
			}
		});

		it("should handle value with only spaces", () => {
			const result = parse("key =    ");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries[0]?.value).toBe("");
			}
		});

		it("should preserve equals signs in values", () => {
			const result = parse("equation = 2 + 2 = 4");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries[0]?.value).toBe("2 + 2 = 4");
			}
		});
	});

	describe("multiline values", () => {
		it("should capture indented continuation lines", () => {
			const result = parse("key = first\n  second\n  third");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(1);
				expect(result.entries[0]?.value).toBe("first\n  second\n  third");
			}
		});

		it("should preserve empty lines within multiline value", () => {
			const result = parse("key = first\n\n  third");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries[0]?.value).toBe("first\n\n  third");
			}
		});

		it("should end multiline value at new entry", () => {
			const result = parse("first = value1\n  continued\nsecond = value2");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(2);
				expect(result.entries[0]?.value).toBe("value1\n  continued");
				expect(result.entries[1]?.value).toBe("value2");
			}
		});

		it("should trim trailing whitespace from values", () => {
			const result = parse("key = value\n  line2\n\n");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries[0]?.value).toBe("value\n  line2");
			}
		});
	});

	describe("standalone keys (no equals sign)", () => {
		it("should handle standalone key as empty value", () => {
			const result = parse("key = value\nstandalone");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(2);
				expect(result.entries[1]).toEqual({ key: "standalone", value: "" });
			}
		});
	});

	describe("indentation handling", () => {
		it("should skip leading empty lines", () => {
			const result = parse("\n\n\nkey = value");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(1);
				expect(result.entries[0]).toEqual({ key: "key", value: "value" });
			}
		});

		it("should establish base indent from first content line", () => {
			const result = parse("  key1 = value1\n  key2 = value2");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(2);
			}
		});

		it("should handle tab indentation", () => {
			const result = parse("key = value\n\tcontinued");
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(1);
				expect(result.entries[0]?.value).toContain("continued");
			}
		});
	});

	describe("edge cases", () => {
		it("should handle line with only equals sign", () => {
			const result = parse("=");
			expect(result.success).toBe(true);
			if (result.success) {
				// Empty key with empty value
				expect(result.entries[0]).toEqual({ key: "", value: "" });
			}
		});

		it("should handle complex nested structure", () => {
			const input = `server =
  host = localhost
  port = 5432
client =
  timeout = 30`;
			const result = parse(input);
			expect(result.success).toBe(true);
			if (result.success) {
				expect(result.entries).toHaveLength(2);
				expect(result.entries[0]?.key).toBe("server");
				expect(result.entries[0]?.value).toContain("host = localhost");
				expect(result.entries[1]?.key).toBe("client");
			}
		});
	});
});

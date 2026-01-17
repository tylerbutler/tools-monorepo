import { err, ok } from "true-myth/result";
import { describe, expect, it } from "vitest";
import type {
	CCLObject,
	Entry,
	HierarchyResult,
	ParseResult,
} from "../../src/types.js";
import {
	isHierarchyResult,
	isLegacyHierarchyResult,
	isLegacyParseResult,
	isParseResult,
	isResult,
	normalizeBuildHierarchyFunction,
	normalizeParseFunction,
} from "../../src/types.js";

describe("Type Guard Functions", () => {
	describe("isResult", () => {
		it("should return true for ok Result", () => {
			const result = ok([{ key: "foo", value: "bar" }]);
			expect(isResult(result)).toBe(true);
		});

		it("should return true for err Result", () => {
			const result = err({ message: "Parse error" });
			expect(isResult(result)).toBe(true);
		});

		it("should return false for legacy ParseResult", () => {
			const result: ParseResult = {
				success: true,
				entries: [{ key: "foo", value: "bar" }],
			};
			expect(isResult(result)).toBe(false);
		});

		it("should return false for null", () => {
			expect(isResult(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isResult(undefined)).toBe(false);
		});

		it("should return false for primitive values", () => {
			expect(isResult("string")).toBe(false);
			expect(isResult(42)).toBe(false);
			expect(isResult(true)).toBe(false);
		});
	});

	describe("isLegacyParseResult", () => {
		it("should return true for successful legacy ParseResult", () => {
			const result: ParseResult = {
				success: true,
				entries: [{ key: "foo", value: "bar" }],
			};
			expect(isLegacyParseResult(result)).toBe(true);
		});

		it("should return true for failed legacy ParseResult", () => {
			const result: ParseResult = {
				success: false,
				error: { message: "Parse error" },
			};
			expect(isLegacyParseResult(result)).toBe(true);
		});

		it("should return false for true-myth Result", () => {
			const result = ok([{ key: "foo", value: "bar" }]);
			expect(isLegacyParseResult(result)).toBe(false);
		});

		it("should return false for null", () => {
			expect(isLegacyParseResult(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isLegacyParseResult(undefined)).toBe(false);
		});
	});

	describe("isParseResult (deprecated alias)", () => {
		it("should return true for successful ParseResult", () => {
			const result: ParseResult = {
				success: true,
				entries: [{ key: "foo", value: "bar" }],
			};
			expect(isParseResult(result)).toBe(true);
		});

		it("should return true for failed ParseResult", () => {
			const result: ParseResult = {
				success: false,
				error: { message: "Parse error" },
			};
			expect(isParseResult(result)).toBe(true);
		});

		it("should return false for null", () => {
			expect(isParseResult(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isParseResult(undefined)).toBe(false);
		});

		it("should return false for primitive values", () => {
			expect(isParseResult("string")).toBe(false);
			expect(isParseResult(42)).toBe(false);
			expect(isParseResult(true)).toBe(false);
		});

		it("should return false for Entry array (not ParseResult)", () => {
			const entries: Entry[] = [{ key: "foo", value: "bar" }];
			expect(isParseResult(entries)).toBe(false);
		});

		it("should return false for object without success property", () => {
			expect(isParseResult({ entries: [] })).toBe(false);
		});

		it("should return false for object with non-boolean success", () => {
			expect(isParseResult({ success: "true", entries: [] })).toBe(false);
		});
	});

	describe("isLegacyHierarchyResult", () => {
		it("should return true for successful legacy HierarchyResult", () => {
			const result: HierarchyResult = {
				success: true,
				object: { foo: "bar" },
			};
			expect(isLegacyHierarchyResult(result)).toBe(true);
		});

		it("should return true for failed legacy HierarchyResult", () => {
			const result: HierarchyResult = {
				success: false,
				error: { message: "Hierarchy error" },
			};
			expect(isLegacyHierarchyResult(result)).toBe(true);
		});

		it("should return false for true-myth Result", () => {
			const result = ok({ foo: "bar" });
			expect(isLegacyHierarchyResult(result)).toBe(false);
		});

		it("should return false for null", () => {
			expect(isLegacyHierarchyResult(null)).toBe(false);
		});
	});

	describe("isHierarchyResult (deprecated alias)", () => {
		it("should return true for successful HierarchyResult", () => {
			const result: HierarchyResult = {
				success: true,
				object: { foo: "bar" },
			};
			expect(isHierarchyResult(result)).toBe(true);
		});

		it("should return true for failed HierarchyResult", () => {
			const result: HierarchyResult = {
				success: false,
				error: { message: "Hierarchy error" },
			};
			expect(isHierarchyResult(result)).toBe(true);
		});

		it("should return false for null", () => {
			expect(isHierarchyResult(null)).toBe(false);
		});

		it("should return false for undefined", () => {
			expect(isHierarchyResult(undefined)).toBe(false);
		});

		it("should return false for primitive values", () => {
			expect(isHierarchyResult("string")).toBe(false);
			expect(isHierarchyResult(42)).toBe(false);
			expect(isHierarchyResult(true)).toBe(false);
		});

		it("should return false for plain CCLObject (not HierarchyResult)", () => {
			const obj: CCLObject = { foo: "bar" };
			expect(isHierarchyResult(obj)).toBe(false);
		});

		it("should return false for object without success property", () => {
			expect(isHierarchyResult({ object: {} })).toBe(false);
		});

		it("should return false for object with non-boolean success", () => {
			expect(isHierarchyResult({ success: 1, object: {} })).toBe(false);
		});
	});
});

describe("Normalization Functions", () => {
	describe("normalizeParseFunction", () => {
		it("should pass through true-myth Result from result-returning function", () => {
			const resultFn = (_input: string) =>
				ok([{ key: "test", value: "value" }]);

			const normalized = normalizeParseFunction(resultFn);
			const result = normalized("any input");

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual([{ key: "test", value: "value" }]);
			}
		});

		it("should pass through true-myth err Result", () => {
			const resultFn = (_input: string) =>
				err({ message: "Test error", line: 5 });

			const normalized = normalizeParseFunction(resultFn);
			const result = normalized("any input");

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("Test error");
				expect(result.error.line).toBe(5);
			}
		});

		it("should convert legacy ParseResult to true-myth Result", () => {
			const legacyFn = (_input: string): ParseResult => ({
				success: true,
				entries: [{ key: "test", value: "value" }],
			});

			const normalized = normalizeParseFunction(legacyFn);
			const result = normalized("any input");

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual([{ key: "test", value: "value" }]);
			}
		});

		it("should convert failed legacy ParseResult to true-myth err", () => {
			const legacyFn = (_input: string): ParseResult => ({
				success: false,
				error: { message: "Test error", line: 5 },
			});

			const normalized = normalizeParseFunction(legacyFn);
			const result = normalized("any input");

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("Test error");
				expect(result.error.line).toBe(5);
			}
		});

		it("should wrap Entry[] from throwing function in ok()", () => {
			const throwingFn = (_input: string): Entry[] => [
				{ key: "foo", value: "bar" },
				{ key: "baz", value: "qux" },
			];

			const normalized = normalizeParseFunction(throwingFn);
			const result = normalized("any input");

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual([
					{ key: "foo", value: "bar" },
					{ key: "baz", value: "qux" },
				]);
			}
		});

		it("should catch Error thrown by function and return err()", () => {
			const throwingFn = (_input: string): Entry[] => {
				throw new Error("Parse failed at line 10");
			};

			const normalized = normalizeParseFunction(throwingFn);
			const result = normalized("any input");

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("Parse failed at line 10");
			}
		});

		it("should catch non-Error thrown by function and convert to string", () => {
			const throwingFn = (_input: string): Entry[] => {
				// biome-ignore lint/style/useThrowOnlyError: Testing non-Error throw handling
				throw "string error";
			};

			const normalized = normalizeParseFunction(throwingFn);
			const result = normalized("any input");

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("string error");
			}
		});

		it("should handle functions that return empty entries array", () => {
			const emptyFn = (_input: string): Entry[] => [];

			const normalized = normalizeParseFunction(emptyFn);
			const result = normalized("");

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual([]);
			}
		});
	});

	describe("normalizeBuildHierarchyFunction", () => {
		it("should pass through true-myth Result from result-returning function", () => {
			const resultFn = (_entries: Entry[]) => ok({ nested: { value: "test" } });

			const normalized = normalizeBuildHierarchyFunction(resultFn);
			const result = normalized([]);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual({ nested: { value: "test" } });
			}
		});

		it("should pass through true-myth err Result", () => {
			const resultFn = (_entries: Entry[]) =>
				err({ message: "Key conflict", line: 3 });

			const normalized = normalizeBuildHierarchyFunction(resultFn);
			const result = normalized([]);

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("Key conflict");
				expect(result.error.line).toBe(3);
			}
		});

		it("should convert legacy HierarchyResult to true-myth Result", () => {
			const legacyFn = (_entries: Entry[]): HierarchyResult => ({
				success: true,
				object: { nested: { value: "test" } },
			});

			const normalized = normalizeBuildHierarchyFunction(legacyFn);
			const result = normalized([]);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual({ nested: { value: "test" } });
			}
		});

		it("should convert failed legacy HierarchyResult to true-myth err", () => {
			const legacyFn = (_entries: Entry[]): HierarchyResult => ({
				success: false,
				error: { message: "Key conflict", line: 3 },
			});

			const normalized = normalizeBuildHierarchyFunction(legacyFn);
			const result = normalized([]);

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("Key conflict");
				expect(result.error.line).toBe(3);
			}
		});

		it("should wrap CCLObject from throwing function in ok()", () => {
			const throwingFn = (entries: Entry[]): CCLObject => {
				const obj: CCLObject = {};
				for (const entry of entries) {
					obj[entry.key] = entry.value;
				}
				return obj;
			};

			const normalized = normalizeBuildHierarchyFunction(throwingFn);
			const result = normalized([
				{ key: "a", value: "1" },
				{ key: "b", value: "2" },
			]);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual({ a: "1", b: "2" });
			}
		});

		it("should catch Error thrown by function and return err()", () => {
			const throwingFn = (_entries: Entry[]): CCLObject => {
				throw new Error("Duplicate key detected");
			};

			const normalized = normalizeBuildHierarchyFunction(throwingFn);
			const result = normalized([]);

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("Duplicate key detected");
			}
		});

		it("should catch non-Error thrown by function and convert to string", () => {
			const throwingFn = (_entries: Entry[]): CCLObject => {
				// biome-ignore lint/style/useThrowOnlyError: Testing non-Error throw handling
				throw 42;
			};

			const normalized = normalizeBuildHierarchyFunction(throwingFn);
			const result = normalized([]);

			expect(result.isErr).toBe(true);
			if (result.isErr) {
				expect(result.error.message).toBe("42");
			}
		});

		it("should handle functions that return empty object", () => {
			const emptyFn = (_entries: Entry[]): CCLObject => ({});

			const normalized = normalizeBuildHierarchyFunction(emptyFn);
			const result = normalized([]);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual({});
			}
		});

		it("should handle complex nested objects", () => {
			const complexFn = (_entries: Entry[]): CCLObject => ({
				server: {
					host: "localhost",
					ports: ["8080", "8443"],
				},
				debug: "true",
			});

			const normalized = normalizeBuildHierarchyFunction(complexFn);
			const result = normalized([]);

			expect(result.isOk).toBe(true);
			if (result.isOk) {
				expect(result.value).toEqual({
					server: {
						host: "localhost",
						ports: ["8080", "8443"],
					},
					debug: "true",
				});
			}
		});
	});
});

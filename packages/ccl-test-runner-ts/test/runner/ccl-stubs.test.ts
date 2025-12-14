import { describe, expect, it } from "vitest";
import { buildHierarchy, parse, parseIndented } from "../../src/ccl.js";
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
});

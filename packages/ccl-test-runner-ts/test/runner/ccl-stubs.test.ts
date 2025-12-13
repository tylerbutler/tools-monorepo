import { describe, expect, it } from "vitest";
import { buildHierarchy, parse, parseIndented } from "../../src/ccl.js";
import { NotYetImplementedError } from "../../src/errors.js";

describe("CCL Functions (Stub Implementations)", () => {
	it("parse should throw NotYetImplementedError", () => {
		expect(() => parse("key = value")).toThrow(NotYetImplementedError);
	});

	it("parseIndented should throw NotYetImplementedError", () => {
		expect(() => parseIndented("key = value")).toThrow(
			NotYetImplementedError,
		);
	});

	it("buildHierarchy should throw NotYetImplementedError", () => {
		expect(() => buildHierarchy([])).toThrow(NotYetImplementedError);
	});
});

import { describe, expect, it } from "vitest";
import {
	createCapabilities,
	getStubCapabilities,
} from "../../src/capabilities.js";
import type { TestCase } from "../../src/schema-validation.js";
import { shouldRunTest } from "../../src/test-data.js";

describe("Capability Configuration", () => {
	it("getStubCapabilities should return empty functions", () => {
		const caps = getStubCapabilities();
		expect(caps.functions).toHaveLength(0);
		expect(caps.features).toHaveLength(0);
	});

	it("createCapabilities should merge with defaults", () => {
		const caps = createCapabilities({
			name: "my-impl",
			functions: ["parse"],
		});

		expect(caps.name).toBe("my-impl");
		expect(caps.functions).toContain("parse");
		// Should have default behaviors
		expect(caps.behaviors.length).toBeGreaterThan(0);
	});
});

describe("Capability Filtering", () => {
	it("should skip tests with conflicting behaviors", () => {
		// Create capabilities with boolean_lenient
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse", "build_hierarchy", "get_bool"],
			features: [],
			behaviors: [
				"boolean_lenient", // We use lenient
				"crlf_normalize_to_lf",
				"tabs_to_spaces",
				"loose_spacing",
				"list_coercion_disabled",
			],
			variant: "proposed_behavior",
		});

		// Create a mock test that requires boolean_strict
		const testCase: TestCase = {
			name: "test_boolean_strict",
			inputs: ["enabled = true"],
			validation: "get_bool",
			expected: { count: 1, value: true },
			functions: ["parse", "build_hierarchy", "get_bool"],
			features: [],
			behaviors: ["boolean_strict"], // Requires strict
			variants: [],
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Behavior conflict");
	});

	it("should skip tests with variant mismatch", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			features: [],
			behaviors: [],
			variant: "proposed_behavior",
		});

		// Create a mock test that requires reference_compliant
		const testCase: TestCase = {
			name: "test_reference",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: ["reference_compliant"], // Requires reference
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Variant mismatch");
	});
});

import { describe, expect, it } from "vitest";
import {
	ALL_FUNCTIONS,
	ALL_VARIANTS,
	BEHAVIOR_CONFLICTS,
	Behavior,
	CapabilityValidationError,
	createCapabilities,
	DefaultBehaviors,
	getConflictingBehavior,
	getStubCapabilities,
	STANDARD_FEATURES,
	Variant,
	validateCapabilities,
} from "../../src/capabilities.js";
import type { TestCase } from "../../src/schema-validation.js";
import { shouldRunTest } from "../../src/test-data.js";

describe("Capability Configuration", () => {
	it("getStubCapabilities should return empty functions", () => {
		const caps = getStubCapabilities();
		expect(caps.functions).toHaveLength(0);
		expect(caps.features).toHaveLength(0);
	});

	it("getStubCapabilities should have default behaviors", () => {
		const caps = getStubCapabilities();
		expect(caps.behaviors).toContain("boolean_lenient");
		expect(caps.behaviors).toContain("crlf_normalize_to_lf");
		expect(caps.variant).toBe("proposed_behavior");
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

	it("createCapabilities should use provided version", () => {
		const caps = createCapabilities({
			name: "my-impl",
			version: "2.0.0",
			functions: ["parse"],
		});

		expect(caps.version).toBe("2.0.0");
	});

	it("createCapabilities should use default version if not provided", () => {
		const caps = createCapabilities({
			name: "my-impl",
			functions: ["parse"],
		});

		expect(caps.version).toBe("0.1.0");
	});
});

describe("validateCapabilities", () => {
	it("should pass validation for valid capabilities", () => {
		const caps = createCapabilities({
			name: "test",
			functions: ["parse"],
			behaviors: ["boolean_lenient"],
		});

		expect(() => validateCapabilities(caps)).not.toThrow();
	});

	it("should throw CapabilityValidationError for conflicting behaviors", () => {
		const caps = {
			name: "test",
			version: "1.0.0",
			functions: [],
			features: [],
			behaviors: ["boolean_strict", "boolean_lenient"] as const,
			variant: "proposed_behavior" as const,
		};

		expect(() => validateCapabilities(caps)).toThrow(CapabilityValidationError);
	});

	it("should include conflict details in error message", () => {
		const caps = {
			name: "test",
			version: "1.0.0",
			functions: [],
			features: [],
			behaviors: ["tabs_preserve", "tabs_to_spaces"] as const,
			variant: "proposed_behavior" as const,
		};

		try {
			validateCapabilities(caps);
			expect.fail("Should have thrown");
		} catch (e) {
			expect(e).toBeInstanceOf(CapabilityValidationError);
			const error = e as CapabilityValidationError;
			expect(error.errors).toHaveLength(1);
			expect(error.errors[0]).toContain("tab_handling");
		}
	});

	it("should detect multiple conflicts", () => {
		const caps = {
			name: "test",
			version: "1.0.0",
			functions: [],
			features: [],
			behaviors: [
				"boolean_strict",
				"boolean_lenient",
				"tabs_preserve",
				"tabs_to_spaces",
			] as const,
			variant: "proposed_behavior" as const,
		};

		try {
			validateCapabilities(caps);
			expect.fail("Should have thrown");
		} catch (e) {
			const error = e as CapabilityValidationError;
			expect(error.errors.length).toBeGreaterThanOrEqual(2);
		}
	});
});

describe("getConflictingBehavior", () => {
	it("should return conflicting behavior for boolean_strict", () => {
		expect(getConflictingBehavior("boolean_strict")).toBe("boolean_lenient");
	});

	it("should return conflicting behavior for boolean_lenient", () => {
		expect(getConflictingBehavior("boolean_lenient")).toBe("boolean_strict");
	});

	it("should return conflicting behavior for crlf options", () => {
		expect(getConflictingBehavior("crlf_preserve_literal")).toBe(
			"crlf_normalize_to_lf",
		);
		expect(getConflictingBehavior("crlf_normalize_to_lf")).toBe(
			"crlf_preserve_literal",
		);
	});

	it("should return conflicting behavior for tab options", () => {
		expect(getConflictingBehavior("tabs_preserve")).toBe("tabs_to_spaces");
		expect(getConflictingBehavior("tabs_to_spaces")).toBe("tabs_preserve");
	});

	it("should return conflicting behavior for spacing options", () => {
		expect(getConflictingBehavior("strict_spacing")).toBe("loose_spacing");
		expect(getConflictingBehavior("loose_spacing")).toBe("strict_spacing");
	});

	it("should return conflicting behavior for list coercion options", () => {
		expect(getConflictingBehavior("list_coercion_enabled")).toBe(
			"list_coercion_disabled",
		);
		expect(getConflictingBehavior("list_coercion_disabled")).toBe(
			"list_coercion_enabled",
		);
	});

	it("should return conflicting behavior for array order options", () => {
		expect(getConflictingBehavior("array_order_insertion")).toBe(
			"array_order_lexicographic",
		);
		expect(getConflictingBehavior("array_order_lexicographic")).toBe(
			"array_order_insertion",
		);
	});
});

describe("Constants exports", () => {
	it("should export Behavior constants", () => {
		expect(Behavior.BooleanStrict).toBe("boolean_strict");
		expect(Behavior.BooleanLenient).toBe("boolean_lenient");
		expect(Behavior.CRLFPreserve).toBe("crlf_preserve_literal");
		expect(Behavior.CRLFNormalize).toBe("crlf_normalize_to_lf");
		expect(Behavior.TabsPreserve).toBe("tabs_preserve");
		expect(Behavior.TabsToSpaces).toBe("tabs_to_spaces");
		expect(Behavior.StrictSpacing).toBe("strict_spacing");
		expect(Behavior.LooseSpacing).toBe("loose_spacing");
		expect(Behavior.ListCoercionEnabled).toBe("list_coercion_enabled");
		expect(Behavior.ListCoercionDisabled).toBe("list_coercion_disabled");
		expect(Behavior.ArrayOrderInsertion).toBe("array_order_insertion");
		expect(Behavior.ArrayOrderLexicographic).toBe("array_order_lexicographic");
	});

	it("should export Variant constants", () => {
		expect(Variant.ProposedBehavior).toBe("proposed_behavior");
		expect(Variant.ReferenceCompliant).toBe("reference_compliant");
	});

	it("should export ALL_FUNCTIONS array", () => {
		expect(ALL_FUNCTIONS).toContain("parse");
		expect(ALL_FUNCTIONS).toContain("build_hierarchy");
		expect(ALL_FUNCTIONS).toContain("get_string");
	});

	it("should export STANDARD_FEATURES array", () => {
		expect(STANDARD_FEATURES).toContain("comments");
		expect(STANDARD_FEATURES).toContain("unicode");
	});

	it("should export ALL_VARIANTS array", () => {
		expect(ALL_VARIANTS).toContain("proposed_behavior");
		expect(ALL_VARIANTS).toContain("reference_compliant");
	});

	it("should export DefaultBehaviors", () => {
		expect(DefaultBehaviors).toContain("boolean_lenient");
		expect(DefaultBehaviors).toContain("crlf_normalize_to_lf");
	});

	it("should export BEHAVIOR_CONFLICTS", () => {
		expect(BEHAVIOR_CONFLICTS.boolean).toEqual([
			"boolean_strict",
			"boolean_lenient",
		]);
		expect(BEHAVIOR_CONFLICTS.crlf_handling).toEqual([
			"crlf_preserve_literal",
			"crlf_normalize_to_lf",
		]);
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

	it("should run tests with matching variant", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			variant: "proposed_behavior",
		});

		const testCase: TestCase = {
			name: "test_proposed",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: ["proposed_behavior"],
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(true);
	});

	it("should skip tests with missing required features", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			features: [], // No features
		});

		const testCase: TestCase = {
			name: "test_comments",
			inputs: ["/= comment\nkey = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: ["comments"], // Requires comments
			behaviors: [],
			variants: [],
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Missing required features");
	});

	it("should skip tests with missing required functions", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"], // Only parse
		});

		const testCase: TestCase = {
			name: "test_hierarchy",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse", "build_hierarchy"], // Requires both
			features: [],
			behaviors: [],
			variants: [],
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Missing required functions");
	});

	it("should skip explicitly skipped tests", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			skipTests: ["skip_this_test"],
		});

		const testCase: TestCase = {
			name: "skip_this_test",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Explicitly skipped");
	});

	it("should skip tests missing behavior without explicit conflict", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			behaviors: [], // No behaviors declared
		});

		const testCase: TestCase = {
			name: "test_behavior",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: ["boolean_strict"], // Requires behavior
			variants: [],
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Missing behavior");
	});
});

describe("Conflict checking", () => {
	it("should skip tests with function conflicts", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse", "filter"],
		});

		const testCase: TestCase = {
			name: "test_conflict",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			conflicts: {
				functions: ["filter"], // Conflicts with filter
			},
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Function conflict");
	});

	it("should skip tests with behavior conflicts", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			behaviors: ["boolean_lenient"],
		});

		const testCase: TestCase = {
			name: "test_conflict",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			conflicts: {
				behaviors: ["boolean_lenient"], // Conflicts with our behavior
			},
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Behavior conflict");
	});

	it("should skip tests with variant conflicts", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			variant: "proposed_behavior",
		});

		const testCase: TestCase = {
			name: "test_conflict",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			conflicts: {
				variants: ["proposed_behavior"], // Conflicts with our variant
			},
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Variant conflict");
	});

	it("should skip tests with feature conflicts", () => {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
			features: ["comments"],
		});

		const testCase: TestCase = {
			name: "test_conflict",
			inputs: ["key = value"],
			validation: "parse",
			expected: { count: 1 },
			functions: ["parse"],
			features: [],
			behaviors: [],
			variants: [],
			conflicts: {
				features: ["comments"], // Conflicts with our feature
			},
			source_test: "test_source",
		};

		const result = shouldRunTest(testCase, capabilities);
		expect(result.shouldRun).toBe(false);
		expect(result.skipReason).toContain("Feature conflict");
	});
});

/**
 * Types derived from JSON schema using json-schema-to-ts.
 *
 * This is the single source of truth for test data types.
 * The schema is defined inline with `as const` for proper type inference.
 */
import type { FromSchema, JSONSchema } from "json-schema-to-ts";

// The test case schema extracted from generated-format.json
// We define it inline with `as const` for proper type inference
const testCaseSchema = {
	type: "object",
	required: [
		"name",
		"inputs",
		"validation",
		"expected",
		"behaviors",
		"variants",
		"features",
	],
	properties: {
		name: {
			type: "string",
			description: "Unique test name (source_name + validation function)",
		},
		inputs: {
			type: "array",
			description: "CCL input text(s) to be tested",
			items: { type: "string" },
			minItems: 1,
		},
		validation: {
			type: "string",
			description: "Single CCL function to validate",
		},
		expected: {
			type: "object",
			description: "Expected result in standardized format",
			required: ["count"],
			properties: {
				count: {
					type: "integer",
					description: "Number of expected results/assertions",
				},
				entries: {
					type: "array",
					description: "Expected entries for parse functions",
					items: {
						type: "object",
						required: ["key", "value"],
						properties: {
							key: { type: "string" },
							value: { type: "string" },
						},
						additionalProperties: false,
					},
				},
				object: {
					type: "object",
					description: "Expected object for hierarchy functions",
					additionalProperties: true,
				},
				value: {
					description: "Expected single value for typed access functions",
				},
				list: {
					type: "array",
					description: "Expected list for list access functions",
				},
				text: {
					type: "string",
					description: "Expected text output for print function",
				},
				boolean: {
					type: "boolean",
					description: "Expected boolean result for algebraic property tests",
				},
				error: {
					type: "boolean",
					description: "Whether this should produce an error",
				},
			},
			additionalProperties: false,
		},
		args: {
			type: "array",
			description: "Arguments for typed access functions",
			items: { type: "string" },
		},
		functions: {
			type: "array",
			description: "CCL functions tested by this test",
			items: { type: "string" },
		},
		behaviors: {
			type: "array",
			description: "Implementation behavior choices",
			items: { type: "string" },
			uniqueItems: true,
		},
		variants: {
			type: "array",
			description: "Specification variants",
			items: { type: "string" },
			uniqueItems: true,
		},
		features: {
			type: "array",
			description: "Required language features",
			items: { type: "string" },
			uniqueItems: true,
		},
		conflicts: {
			type: "object",
			description: "Mutually exclusive options by category",
			properties: {
				functions: { type: "array", items: { type: "string" } },
				behaviors: { type: "array", items: { type: "string" } },
				variants: { type: "array", items: { type: "string" } },
				features: { type: "array", items: { type: "string" } },
			},
			additionalProperties: false,
		},
		requires: {
			type: "array",
			description: "Functions that must be implemented as prerequisites",
			items: { type: "string" },
		},
		source_test: {
			type: "string",
			description: "Original source test name for traceability",
		},
		expect_error: {
			type: "boolean",
			description: "Whether this test should produce an error",
		},
		error_type: {
			type: "string",
			description: "Expected error type for error tests",
		},
	},
	additionalProperties: false,
} as const satisfies JSONSchema;

const testFileSchema = {
	type: "object",
	required: ["tests"],
	properties: {
		$schema: { type: "string" },
		tests: {
			type: "array",
			minItems: 1,
			items: testCaseSchema,
		},
	},
	additionalProperties: false,
} as const satisfies JSONSchema;

/**
 * Primary types derived from schema.
 * These are the canonical types for test data structures.
 */
export type TestCase = FromSchema<typeof testCaseSchema>;
export type TestFile = FromSchema<typeof testFileSchema>;
export type TestExpected = TestCase["expected"];
export type TestConflicts = NonNullable<TestCase["conflicts"]>;

// Export schemas for runtime validation if needed
export { testCaseSchema, testFileSchema };

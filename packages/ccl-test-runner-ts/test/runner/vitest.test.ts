import { describe, expect, it } from "vitest";
import {
	Behavior,
	createCapabilities,
	DefaultBehaviors,
	Variant,
} from "../../src/capabilities.js";
import type { TestCase } from "../../src/schema-validation.js";
import type {
	CCLObject,
	Entry,
	HierarchyResult,
	ParseResult,
} from "../../src/types.js";
import {
	type CCLFunctions,
	type CCLTestConfig,
	categorizeTest,
	defineCCLTests,
	runCCLTest,
} from "../../src/vitest.js";

// Helper to create minimal test cases
function createTestCase(overrides: Partial<TestCase>): TestCase {
	const { expected: expectedOverrides, ...restOverrides } = overrides;
	return {
		name: "test_case",
		inputs: ["key = value"],
		validation: "parse",
		expected: { count: 1, ...expectedOverrides },
		behaviors: [],
		variants: [],
		features: [],
		...restOverrides,
	};
}

describe("defineCCLTests", () => {
	it("should return config unchanged", () => {
		const config: CCLTestConfig = {
			name: "test-impl",
			version: "1.0.0",
			testDataPath: "./test-data",
			functions: {},
		};

		const result = defineCCLTests(config);
		expect(result).toBe(config);
	});

	it("should validate config and throw on conflicting behaviors", () => {
		const config: CCLTestConfig = {
			name: "test-impl",
			testDataPath: "./test-data",
			functions: {},
			behaviors: ["boolean_strict", "boolean_lenient"], // Conflict!
		};

		expect(() => defineCCLTests(config)).toThrow("Conflicting behaviors");
	});
});

describe("runCCLTest", () => {
	describe("parse validation", () => {
		it("should run parse validation successfully", () => {
			const testCase = createTestCase({
				name: "simple_parse",
				inputs: ["name = Alice"],
				validation: "parse",
				expected: {
					count: 1,
					entries: [{ key: "name", value: "Alice" }],
				},
			});

			const functions: CCLFunctions = {
				parse: (input: string): Entry[] => {
					const match = input.match(/(\w+)\s*=\s*(.+)/);
					if (match) {
						return [{ key: match[1], value: match[2] }];
					}
					return [];
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(true);
			expect(result.error).toBeUndefined();
			expect(result.output).toEqual([{ key: "name", value: "Alice" }]);
		});

		it("should return error when parse function not implemented", () => {
			const testCase = createTestCase({ validation: "parse" });
			const functions: CCLFunctions = {};
			const capabilities = createCapabilities({
				name: "test",
				functions: [],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("parse function not implemented");
		});

		it("should handle parse function that returns ParseResult", () => {
			const testCase = createTestCase({
				inputs: ["key = value"],
				expected: { count: 1 },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): ParseResult => ({
					success: true,
					entries: [{ key: "key", value: "value" }],
				}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
		});

		it("should handle parse failure", () => {
			const testCase = createTestCase({
				inputs: ["invalid"],
				expected: { count: 1 },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): ParseResult => ({
					success: false,
					error: { message: "Invalid syntax" },
				}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("Parse failed");
		});

		it("should detect count mismatch", () => {
			const testCase = createTestCase({
				inputs: ["a = 1\nb = 2"],
				expected: { count: 1 }, // Expects 1 but will get 2
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [
					{ key: "a", value: "1" },
					{ key: "b", value: "2" },
				],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("Count mismatch");
		});

		it("should detect entries mismatch", () => {
			const testCase = createTestCase({
				inputs: ["key = value"],
				expected: {
					count: 1,
					entries: [{ key: "key", value: "different" }],
				},
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "key", value: "value" }],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("Entries mismatch");
		});
	});

	describe("build_hierarchy validation", () => {
		it("should run build_hierarchy validation successfully", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				inputs: ["server =\n  host = localhost"],
				expected: {
					count: 1,
					object: { server: { host: "localhost" } },
				},
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [
					{ key: "server", value: "\n  host = localhost" },
				],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({
					server: { host: "localhost" },
				}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(true);
		});

		it("should return error when parse or build_hierarchy not implemented", () => {
			const testCase = createTestCase({ validation: "build_hierarchy" });
			const functions: CCLFunctions = { parse: () => [] };
			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("build_hierarchy functions required");
		});

		it("should handle build_hierarchy failure", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				inputs: ["key = value"],
				expected: { count: 1, object: {} },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "key", value: "value" }],
				build_hierarchy: (_entries: Entry[]): HierarchyResult => ({
					success: false,
					error: { message: "Key conflict" },
				}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("Build hierarchy failed");
		});

		it("should detect object mismatch", () => {
			const testCase = createTestCase({
				validation: "build_hierarchy",
				inputs: ["key = value"],
				expected: { count: 1, object: { key: "different" } },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "key", value: "value" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ key: "value" }),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("Object mismatch");
		});
	});

	describe("unsupported validation", () => {
		it("should return error for unsupported validation type", () => {
			const testCase = createTestCase({
				validation: "unknown_function" as "parse",
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("Unsupported validation type");
		});
	});

	describe("preprocessing", () => {
		it("should normalize CRLF to LF when behavior is enabled", () => {
			const testCase = createTestCase({
				inputs: ["key = value\r\nother = data"],
				expected: { count: 2 },
			});

			let capturedInput = "";
			const functions: CCLFunctions = {
				parse: (input: string): Entry[] => {
					capturedInput = input;
					return [
						{ key: "key", value: "value" },
						{ key: "other", value: "data" },
					];
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
				behaviors: ["crlf_normalize_to_lf"],
			});

			runCCLTest(testCase, functions, capabilities);

			expect(capturedInput).toBe("key = value\nother = data");
			expect(capturedInput).not.toContain("\r");
		});
	});

	describe("postprocessing", () => {
		it("should strip leading tabs when loose_spacing enabled", () => {
			const testCase = createTestCase({
				inputs: ["key = value"],
				expected: {
					count: 1,
					entries: [{ key: "key", value: "hello" }],
				},
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [
					{ key: "key", value: "\t\thello" },
				],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
				behaviors: ["loose_spacing"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(true);
			expect(result.output).toEqual([{ key: "key", value: "hello" }]);
		});

		it("should convert tabs to spaces when tabs_to_spaces enabled", () => {
			const testCase = createTestCase({
				inputs: ["key = value"],
				expected: {
					count: 1,
					entries: [{ key: "key", value: "a  b" }],
				},
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "key", value: "a\tb" }],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
				behaviors: ["tabs_to_spaces"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(true);
		});
	});

	describe("error handling", () => {
		it("should throw for test case with no inputs", () => {
			const testCase = createTestCase({
				inputs: [],
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			// runCCLTest throws synchronously for missing inputs
			expect(() => runCCLTest(testCase, functions, capabilities)).toThrow(
				"has no inputs",
			);
		});

		it("should catch exceptions during test execution", () => {
			const testCase = createTestCase({
				inputs: ["key = value"],
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => {
					throw new Error("Unexpected crash");
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);

			expect(result.passed).toBe(false);
			expect(result.error).toContain("Unexpected crash");
		});
	});
});

describe("categorizeTest", () => {
	// Create a mock context factory
	function createContext(overrides: {
		functions?: string[];
		skipTests?: string[];
		features?: string[];
		behaviors?: string[];
		variant?: string;
	}) {
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: (overrides.functions ?? []) as Parameters<
				typeof createCapabilities
			>[0]["functions"],
			features: overrides.features as Parameters<
				typeof createCapabilities
			>[0]["features"],
			behaviors: overrides.behaviors as Parameters<
				typeof createCapabilities
			>[0]["behaviors"],
			variant: (overrides.variant ?? "proposed_behavior") as Parameters<
				typeof createCapabilities
			>[0]["variant"],
			skipTests: overrides.skipTests,
		});

		return {
			config: { name: "test", testDataPath: "./", functions: {} },
			capabilities,
			implementedFunctions: new Set(overrides.functions ?? []),
		};
	}

	it("should return 'run' for compatible test", () => {
		const testCase = createTestCase({
			validation: "parse",
			functions: ["parse"],
		});

		const context = createContext({ functions: ["parse"] });
		const result = categorizeTest(testCase, context);

		expect(result.type).toBe("run");
	});

	it("should return 'skip' for explicitly skipped test", () => {
		const testCase = createTestCase({ name: "skip_me" });
		const context = createContext({
			functions: ["parse"],
			skipTests: ["skip_me"],
		});

		const result = categorizeTest(testCase, context);

		expect(result.type).toBe("skip");
		if (result.type === "skip") {
			expect(result.reason).toContain("Explicitly skipped");
		}
	});

	it("should return 'skip' when validation function not supported", () => {
		const testCase = createTestCase({ validation: "build_hierarchy" });
		const context = createContext({ functions: ["parse"] });

		const result = categorizeTest(testCase, context);

		expect(result.type).toBe("skip");
		if (result.type === "skip") {
			expect(result.reason).toContain("not supported");
		}
	});

	it("should return 'todo' when validation function declared but not implemented", () => {
		const testCase = createTestCase({ validation: "parse" });

		// Declare parse in capabilities but not in implementedFunctions
		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse"],
		});

		const context = {
			config: { name: "test", testDataPath: "./", functions: {} },
			capabilities,
			implementedFunctions: new Set<string>(), // Not implemented
		};

		const result = categorizeTest(testCase, context);

		expect(result.type).toBe("todo");
		if (result.type === "todo") {
			expect(result.reason).toContain("declared but not implemented");
		}
	});

	it("should return 'skip' when required function not supported", () => {
		const testCase = createTestCase({
			validation: "parse",
			functions: ["parse", "build_hierarchy"],
		});

		const context = createContext({ functions: ["parse"] });
		const result = categorizeTest(testCase, context);

		expect(result.type).toBe("skip");
		if (result.type === "skip") {
			expect(result.reason).toContain("build_hierarchy");
		}
	});

	it("should return 'todo' when required function declared but not implemented", () => {
		const testCase = createTestCase({
			validation: "parse",
			functions: ["parse", "filter"],
		});

		const capabilities = createCapabilities({
			name: "test-impl",
			functions: ["parse", "filter"],
		});

		const context = {
			config: { name: "test", testDataPath: "./", functions: {} },
			capabilities,
			implementedFunctions: new Set(["parse"]), // filter not implemented
		};

		const result = categorizeTest(testCase, context);

		expect(result.type).toBe("todo");
		if (result.type === "todo") {
			expect(result.reason).toContain("filter");
		}
	});

	it("should NOT return 'skip' when features don't match (features are metadata only)", () => {
		const testCase = createTestCase({
			validation: "parse",
			features: ["comments"],
		});

		const context = createContext({ functions: ["parse"], features: [] });
		const result = categorizeTest(testCase, context);

		// Features don't affect test categorization - tests should run
		expect(result.type).toBe("run");
	});
});

describe("Behavior and Variant exports", () => {
	it("should export Behavior constants", () => {
		expect(Behavior.BooleanStrict).toBe("boolean_strict");
		expect(Behavior.BooleanLenient).toBe("boolean_lenient");
		expect(Behavior.CRLFPreserve).toBe("crlf_preserve_literal");
		expect(Behavior.CRLFNormalize).toBe("crlf_normalize_to_lf");
	});

	it("should export Variant constants", () => {
		expect(Variant.ProposedBehavior).toBe("proposed_behavior");
		expect(Variant.ReferenceCompliant).toBe("reference_compliant");
	});

	it("should export DefaultBehaviors", () => {
		expect(DefaultBehaviors).toContain("boolean_lenient");
		expect(DefaultBehaviors).toContain("crlf_normalize_to_lf");
	});
});

describe("runCCLTest typed access validations", () => {
	describe("get_string validation", () => {
		it("should run get_string validation successfully", () => {
			const testCase = createTestCase({
				validation: "get_string",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { value: "Alice" },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_string: (obj: CCLObject, ...path: string[]) =>
					obj[path[0]] as string,
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_string"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
			expect(result.output).toBe("Alice");
		});

		it("should handle expected error case", () => {
			const testCase = createTestCase({
				validation: "get_string",
				inputs: ["name = Alice"],
				args: ["missing"],
				expected: { error: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_string: (_obj: CCLObject, ...path: string[]) => {
					throw new Error(`Path not found: ${path.join(".")}`);
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_string"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
		});

		it("should fail when expected error but function succeeds", () => {
			const testCase = createTestCase({
				validation: "get_string",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { error: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_string: (obj: CCLObject, ...path: string[]) =>
					obj[path[0]] as string,
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_string"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("Expected error but function succeeded");
		});

		it("should detect value mismatch", () => {
			const testCase = createTestCase({
				validation: "get_string",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { value: "Bob" },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_string: (obj: CCLObject, ...path: string[]) =>
					obj[path[0]] as string,
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_string"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain('Expected "Bob"');
		});

		it("should return error when get_string not implemented", () => {
			const testCase = createTestCase({
				validation: "get_string",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { value: "Alice" },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("get_string function not implemented");
		});
	});

	describe("get_int validation", () => {
		it("should run get_int validation successfully", () => {
			const testCase = createTestCase({
				validation: "get_int",
				inputs: ["port = 8080"],
				args: ["port"],
				expected: { value: 8080 },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "port", value: "8080" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ port: "8080" }),
				get_int: (_obj: CCLObject, ..._path: string[]) => 8080,
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_int"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
			expect(result.output).toBe(8080);
		});

		it("should handle expected error case", () => {
			const testCase = createTestCase({
				validation: "get_int",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { error: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_int: () => {
					throw new Error("Not a valid integer");
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_int"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
		});

		it("should return error when get_int not implemented", () => {
			const testCase = createTestCase({
				validation: "get_int",
				inputs: ["port = 8080"],
				args: ["port"],
				expected: { value: 8080 },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("get_int function not implemented");
		});
	});

	describe("get_bool validation", () => {
		it("should run get_bool validation successfully", () => {
			const testCase = createTestCase({
				validation: "get_bool",
				inputs: ["enabled = true"],
				args: ["enabled"],
				expected: { value: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "enabled", value: "true" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({
					enabled: "true",
				}),
				get_bool: () => true,
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_bool"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
			expect(result.output).toBe(true);
		});

		it("should handle expected error case", () => {
			const testCase = createTestCase({
				validation: "get_bool",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { error: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_bool: () => {
					throw new Error("Not a valid boolean");
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_bool"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
		});

		it("should return error when get_bool not implemented", () => {
			const testCase = createTestCase({
				validation: "get_bool",
				inputs: ["enabled = true"],
				args: ["enabled"],
				expected: { value: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("get_bool function not implemented");
		});
	});

	describe("get_float validation", () => {
		it("should run get_float validation successfully", () => {
			const testCase = createTestCase({
				validation: "get_float",
				inputs: ["ratio = 3.14"],
				args: ["ratio"],
				expected: { value: 3.14 },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "ratio", value: "3.14" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ ratio: "3.14" }),
				get_float: () => 3.14,
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_float"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
			expect(result.output).toBe(3.14);
		});

		it("should handle expected error case", () => {
			const testCase = createTestCase({
				validation: "get_float",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { error: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_float: () => {
					throw new Error("Not a valid float");
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_float"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
		});

		it("should return error when get_float not implemented", () => {
			const testCase = createTestCase({
				validation: "get_float",
				inputs: ["ratio = 3.14"],
				args: ["ratio"],
				expected: { value: 3.14 },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("get_float function not implemented");
		});
	});

	describe("get_list validation", () => {
		it("should run get_list validation successfully", () => {
			const testCase = createTestCase({
				validation: "get_list",
				inputs: ["colors = red\ncolors = green"],
				args: ["colors"],
				expected: { list: ["red", "green"] },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [
					{ key: "colors", value: "red" },
					{ key: "colors", value: "green" },
				],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({
					colors: ["red", "green"],
				}),
				get_list: () => ["red", "green"],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_list"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
			expect(result.output).toEqual(["red", "green"]);
		});

		it("should handle expected error case", () => {
			const testCase = createTestCase({
				validation: "get_list",
				inputs: ["name = Alice"],
				args: ["name"],
				expected: { error: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({ name: "Alice" }),
				get_list: () => {
					throw new Error("Not a list");
				},
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_list"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
		});

		it("should return error when get_list not implemented", () => {
			const testCase = createTestCase({
				validation: "get_list",
				inputs: ["colors = red"],
				args: ["colors"],
				expected: { list: ["red"] },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({}),
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("get_list function not implemented");
		});

		it("should handle list mismatch", () => {
			const testCase = createTestCase({
				validation: "get_list",
				inputs: ["colors = red"],
				args: ["colors"],
				expected: { list: ["blue", "green"] },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "colors", value: "red" }],
				build_hierarchy: (_entries: Entry[]): CCLObject => ({
					colors: ["red"],
				}),
				get_list: () => ["red"],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "build_hierarchy", "get_list"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("Expected");
		});
	});
});

describe("runCCLTest formatting validations", () => {
	describe("print validation", () => {
		it("should run print validation successfully", () => {
			const testCase = createTestCase({
				validation: "print",
				inputs: ["name = Alice"],
				expected: { value: "name = Alice" },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				print: (_entries: Entry[]) => "name = Alice",
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "print"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
			expect(result.output).toBe("name = Alice");
		});

		it("should detect print output mismatch", () => {
			const testCase = createTestCase({
				validation: "print",
				inputs: ["name = Alice"],
				expected: { value: "name = Bob" },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				print: (_entries: Entry[]) => "name = Alice",
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "print"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain('Expected "name = Bob"');
		});

		it("should return error when print not implemented", () => {
			const testCase = createTestCase({
				validation: "print",
				inputs: ["name = Alice"],
				expected: { value: "name = Alice" },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("print functions required");
		});
	});

	describe("canonical_format validation", () => {
		it("should run canonical_format validation successfully", () => {
			const testCase = createTestCase({
				validation: "canonical_format",
				inputs: ["z = 1\na = 2"],
				expected: { value: "a =\n  2 =\nz =\n  1 =\n" },
			});

			const functions: CCLFunctions = {
				canonical_format: (_input: string) => "a =\n  2 =\nz =\n  1 =\n",
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["canonical_format"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
		});

		it("should detect canonical_format output mismatch", () => {
			const testCase = createTestCase({
				validation: "canonical_format",
				inputs: ["a = 1"],
				expected: { value: "different output" },
			});

			const functions: CCLFunctions = {
				canonical_format: (_input: string) => "a =\n  1 =\n",
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["canonical_format"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("Expected");
		});

		it("should return error when canonical_format not implemented", () => {
			const testCase = createTestCase({
				validation: "canonical_format",
				inputs: ["a = 1"],
				expected: { value: "a =\n  1 =\n" },
			});

			const functions: CCLFunctions = {};

			const capabilities = createCapabilities({
				name: "test",
				functions: [],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain(
				"canonical_format function not implemented",
			);
		});
	});

	describe("round_trip validation", () => {
		it("should run round_trip validation successfully", () => {
			const testCase = createTestCase({
				validation: "round_trip",
				inputs: ["name = Alice"],
				expected: { value: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				print: (_entries: Entry[]) => "name = Alice",
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "print"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(true);
			expect(result.output).toBe(true);
		});

		it("should detect round_trip mismatch", () => {
			const testCase = createTestCase({
				validation: "round_trip",
				inputs: ["name = Alice"],
				expected: { value: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [{ key: "name", value: "Alice" }],
				print: (_entries: Entry[]) => "name = Bob", // Different output
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse", "print"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain("Round-trip mismatch");
		});

		it("should return error when parse/print not implemented", () => {
			const testCase = createTestCase({
				validation: "round_trip",
				inputs: ["name = Alice"],
				expected: { value: true },
			});

			const functions: CCLFunctions = {
				parse: (_input: string): Entry[] => [],
			};

			const capabilities = createCapabilities({
				name: "test",
				functions: ["parse"],
			});

			const result = runCCLTest(testCase, functions, capabilities);
			expect(result.passed).toBe(false);
			expect(result.error).toContain(
				"parse and print functions required for round_trip",
			);
		});
	});
});

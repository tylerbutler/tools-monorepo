import { all, run } from "effection";
import { describe, expect, it, vi } from "vitest";

import { policy } from "../src/makePolicy.js";
import type {
	PolicyError,
	PolicyFailure,
	PolicyFixResult,
	PolicyShape,
} from "../src/policy.js";
import { PolicyRunner, type PolicyRunnerOptions } from "../src/runner.js";

function makeRunnerOptions(
	overrides: Partial<PolicyRunnerOptions> = {},
): PolicyRunnerOptions {
	return {
		policies: [],
		excludeFromAll: [],
		excludePoliciesForFiles: new Map(),
		gitRoot: "/fake/root",
		resolve: false,
		...overrides,
	};
}

describe("PolicyRunner", () => {
	describe("run", () => {
		it("should return empty results for no files", async () => {
			const runner = new PolicyRunner(makeRunnerOptions());
			const results = await run(() => runner.run([]));
			expect(results.results).toEqual([]);
			expect(results.perfStats.count).toBe(0);
		});

		it("should count all processed files", async () => {
			const runner = new PolicyRunner(makeRunnerOptions());
			const results = await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));
			expect(results.perfStats.count).toBe(3);
		});

		it("should return no results when all policies pass", async () => {
			const passingPolicy = policy({
				name: "PassingPolicy",
				description: "Always passes",
				match: /\.txt$/,
				handler: async () => true,
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [passingPolicy] }),
			);
			const results = await run(() => runner.run(["file.txt"]));
			expect(results.results).toEqual([]);
		});

		it("should use fresh state when a runner is reused", async () => {
			const failingPolicy = policy({
				name: "FailPolicy",
				description: "Always fails",
				match: /\.txt$/,
				handler: async (): Promise<PolicyError> => ({
					error: "Something went wrong",
				}),
			});
			const options = makeRunnerOptions({ policies: [failingPolicy] });
			const runner = new PolicyRunner(options);

			await run(() => runner.run(["first.txt"]));
			const reusedResult = await run(() => runner.run(["second.txt"]));
			const freshResult = await run(() =>
				new PolicyRunner(options).run(["second.txt"]),
			);

			expect(reusedResult.results).toEqual(freshResult.results);
			expect(reusedResult.perfStats.count).toBe(freshResult.perfStats.count);
			expect(reusedResult.results.map(({ file }) => file)).toEqual([
				"second.txt",
			]);
		});

		it("should not mutate a previously returned result after reuse", async () => {
			const failingPolicy = policy({
				name: "FailPolicy",
				description: "Always fails",
				match: /\.txt$/,
				handler: async (): Promise<PolicyError> => ({
					error: "Something went wrong",
				}),
			});
			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [failingPolicy] }),
			);

			const firstResult = await run(() => runner.run(["first.txt"]));
			const firstResultsSnapshot = structuredClone(firstResult.results);
			const firstPerfSnapshot = structuredClone(firstResult.perfStats);
			const secondResult = await run(() => runner.run(["second.txt"]));

			expect(firstResult.results).toEqual(firstResultsSnapshot);
			expect(firstResult.perfStats).toEqual(firstPerfSnapshot);
			expect(firstResult.results).not.toBe(secondResult.results);
			expect(firstResult.perfStats).not.toBe(secondResult.perfStats);
		});

		it("should isolate state between concurrent runs", async () => {
			const failingPolicy = policy({
				name: "FailPolicy",
				description: "Always fails",
				match: /\.txt$/,
				handler: async (): Promise<PolicyError> => ({
					error: "Something went wrong",
				}),
			});
			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [failingPolicy] }),
			);

			const [firstResult, secondResult] = await run(function* () {
				return yield* all([
					runner.run(["first.txt"]),
					runner.run(["second.txt"]),
				]);
			});

			expect(firstResult.results.map(({ file }) => file)).toEqual([
				"first.txt",
			]);
			expect(secondResult.results.map(({ file }) => file)).toEqual([
				"second.txt",
			]);
			expect(firstResult.perfStats.count).toBe(1);
			expect(secondResult.perfStats.count).toBe(1);
			expect(firstResult.results).not.toBe(secondResult.results);
			expect(firstResult.perfStats).not.toBe(secondResult.perfStats);
		});
	});

	describe("exclusion logic", () => {
		it("should exclude files matching excludeFromAll patterns", async () => {
			let handlerCalled = false;
			const testPolicy = policy({
				name: "TestPolicy",
				description: "Test",
				match: /\.txt$/,
				handler: async () => {
					handlerCalled = true;
					return true;
				},
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [testPolicy],
					excludeFromAll: [/node_modules/],
				}),
			);

			const results = await run(() =>
				runner.run(["node_modules/pkg/file.txt"]),
			);
			expect(handlerCalled).toBe(false);
			expect(results.results).toEqual([]);
		});

		it("should exclude files matching per-policy exclusions", async () => {
			let handlerCalled = false;
			const testPolicy = policy({
				name: "TestPolicy",
				description: "Test",
				match: /\.txt$/,
				handler: async () => {
					handlerCalled = true;
					return true;
				},
			});

			const excludeMap = new Map([["TestPolicy", [/generated/]]]);

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [testPolicy],
					excludePoliciesForFiles: excludeMap,
				}),
			);

			const results = await run(() => runner.run(["generated/output.txt"]));
			expect(handlerCalled).toBe(false);
			expect(results.results).toEqual([]);
		});

		it("should log verbose messages for exclusions", async () => {
			const verboseFn = vi.fn();
			const testPolicy = policy({
				name: "TestPolicy",
				description: "Test",
				match: /\.txt$/,
				handler: async () => true,
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [testPolicy],
					excludeFromAll: [/excluded/],
					logger: { verbose: verboseFn },
				}),
			);

			await run(() => runner.run(["excluded/file.txt"]));
			expect(verboseFn).toHaveBeenCalledWith(
				"Excluded all handlers: excluded/file.txt",
			);
		});

		it.each([
			{ flag: "g", regex: /.*\.txt$/g, description: "with global flag" },
			{ flag: "y", regex: /.*\.txt$/y, description: "with sticky flag" },
		])("should support excludeFromAll with regex $description, preserving lastIndex", async ({
			regex,
		}) => {
			let handlerCalled = false;
			const testPolicy = policy({
				name: "TestPolicy",
				description: "Test",
				match: /\.txt$/,
				handler: async () => {
					handlerCalled = true;
					return true;
				},
			});

			// Pre-set lastIndex to simulate prior regex use
			regex.lastIndex = 2;
			const initialLastIndex = regex.lastIndex;

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [testPolicy],
					excludeFromAll: [regex],
				}),
			);

			const results = await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));

			// All files should be excluded
			expect(handlerCalled).toBe(false);
			expect(results.results).toEqual([]);

			// lastIndex should be preserved
			expect(regex.lastIndex).toBe(initialLastIndex);
		});

		it.each([
			{ flag: "g", regex: /.*\.txt$/g, description: "with global flag" },
			{ flag: "y", regex: /.*\.txt$/y, description: "with sticky flag" },
		])("should support per-policy exclusions with regex $description, preserving lastIndex", async ({
			regex,
		}) => {
			let handlerCalled = false;
			const testPolicy = policy({
				name: "TestPolicy",
				description: "Test",
				match: /\.txt$/,
				handler: async () => {
					handlerCalled = true;
					return true;
				},
			});

			// Pre-set lastIndex to simulate prior regex use
			regex.lastIndex = 2;
			const initialLastIndex = regex.lastIndex;

			const excludeMap = new Map([["TestPolicy", [regex]]]);

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [testPolicy],
					excludePoliciesForFiles: excludeMap,
				}),
			);

			const results = await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));

			// All files should be excluded
			expect(handlerCalled).toBe(false);
			expect(results.results).toEqual([]);

			// lastIndex should be preserved
			expect(regex.lastIndex).toBe(initialLastIndex);
		});
	});

	describe("policy matching", () => {
		it("should only run policies that match the file path", async () => {
			const txtCalled: string[] = [];
			const jsCalled: string[] = [];

			const txtPolicy = policy({
				name: "TxtPolicy",
				description: "Matches txt",
				match: /\.txt$/,
				handler: async ({ file }) => {
					txtCalled.push(file);
					return true;
				},
			});

			const jsPolicy = policy({
				name: "JsPolicy",
				description: "Matches js",
				match: /\.mjs$/,
				handler: async ({ file }) => {
					jsCalled.push(file);
					return true;
				},
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [txtPolicy, jsPolicy],
				}),
			);

			await run(() => runner.run(["file.txt", "file.mjs"]));
			expect(txtCalled).toEqual(["file.txt"]);
			expect(jsCalled).toEqual(["file.mjs"]);
		});

		it.each([
			{ flag: "g", regex: /.*\.txt$/g, description: "with global flag" },
			{ flag: "y", regex: /.*\.txt$/y, description: "with sticky flag" },
		])("should run policy match deterministically $description, preserving lastIndex", async ({
			regex,
		}) => {
			const handledFiles: string[] = [];

			const testPolicy = policy({
				name: "TestPolicy",
				description: "Test",
				match: regex,
				handler: async ({ file }) => {
					handledFiles.push(file);
					return true;
				},
			});

			// Pre-set lastIndex to simulate prior regex use
			regex.lastIndex = 2;
			const initialLastIndex = regex.lastIndex;

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [testPolicy],
				}),
			);

			await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));

			// All files should match and be handled
			expect(handledFiles).toEqual(["a.txt", "b.txt", "c.txt"]);

			// lastIndex should be preserved
			expect(regex.lastIndex).toBe(initialLastIndex);
		});
	});

	describe("result collection", () => {
		it("should collect PolicyError results", async () => {
			const failingPolicy = policy({
				name: "FailPolicy",
				description: "Always fails",
				match: /\.txt$/,
				handler: async (): Promise<PolicyError> => ({
					error: "Something went wrong",
					fixable: true,
				}),
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [failingPolicy] }),
			);
			const results = await run(() => runner.run(["bad.txt"]));

			expect(results.results).toHaveLength(1);
			expect(results.results[0].file).toBe("bad.txt");
			expect(results.results[0].policy).toBe("FailPolicy");
			expect(results.results[0].outcome).toEqual({
				error: "Something went wrong",
				fixable: true,
			});
		});

		it("should collect legacy PolicyFailure results", async () => {
			const failingPolicy = policy({
				name: "LegacyFail",
				description: "Legacy failure",
				match: /\.txt$/,
				handler: async ({ file }): Promise<PolicyFailure> => ({
					name: "LegacyFail",
					file,
					errorMessages: ["bad format"],
					autoFixable: false,
				}),
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [failingPolicy] }),
			);
			const results = await run(() => runner.run(["file.txt"]));

			expect(results.results).toHaveLength(1);
			expect(results.results[0].outcome).toMatchObject({
				name: "LegacyFail",
				errorMessages: ["bad format"],
			});
		});

		it("should collect PolicyFixResult when handler resolves inline", async () => {
			const fixPolicy = policy({
				name: "FixPolicy",
				description: "Fixes inline",
				match: /\.txt$/,
				handler: async ({ file }): Promise<PolicyFixResult> => ({
					name: "FixPolicy",
					file,
					resolved: true,
					errorMessages: ["fixed it"],
				}),
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [fixPolicy], resolve: true }),
			);
			const results = await run(() => runner.run(["file.txt"]));

			expect(results.results).toHaveLength(1);
			expect(results.results[0].outcome).toMatchObject({
				resolved: true,
			});
			// No standalone resolution attempted since handler already returned fix result
			expect(results.results[0].resolution).toBeUndefined();
		});

		it("should collect PolicyError with fixed property without attempting resolution", async () => {
			const fixPolicy = policy({
				name: "NewFixPolicy",
				description: "Fixes via new format",
				match: /\.txt$/,
				handler: async (): Promise<PolicyError> => ({
					error: "was wrong",
					fixed: true,
				}),
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [fixPolicy], resolve: true }),
			);
			const results = await run(() => runner.run(["file.txt"]));

			expect(results.results).toHaveLength(1);
			expect(results.results[0].resolution).toBeUndefined();
		});
	});

	describe("standalone resolver", () => {
		it("should attempt resolution when resolve=true and resolver exists", async () => {
			const policyDef: PolicyShape = {
				name: "ResolvablePolicy",
				description: "Has resolver",
				match: /\.txt$/,
				handler: async ({ file }): Promise<PolicyFailure> => ({
					name: "ResolvablePolicy",
					file,
					errorMessages: ["needs fix"],
					autoFixable: true,
				}),
				resolver: async ({ file }): Promise<PolicyFixResult> => ({
					name: "ResolvablePolicy",
					file,
					resolved: true,
					errorMessages: [],
				}),
			};

			const configured = policy(policyDef);
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [configured],
					resolve: true,
				}),
			);

			const results = await run(() => runner.run(["file.txt"]));
			expect(results.results).toHaveLength(1);
			expect(results.results[0].resolution).toBeDefined();
			expect(results.results[0].resolution?.resolved).toBe(true);
		});

		it("should not attempt resolution when resolve=false", async () => {
			let resolverCalled = false;
			const policyDef: PolicyShape = {
				name: "ResolvablePolicy",
				description: "Has resolver",
				match: /\.txt$/,
				handler: async ({ file }): Promise<PolicyFailure> => ({
					name: "ResolvablePolicy",
					file,
					errorMessages: ["needs fix"],
					autoFixable: true,
				}),
				resolver: async ({ file }): Promise<PolicyFixResult> => {
					resolverCalled = true;
					return {
						name: "ResolvablePolicy",
						file,
						resolved: true,
						errorMessages: [],
					};
				},
			};

			const configured = policy(policyDef);
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [configured],
					resolve: false,
				}),
			);

			const results = await run(() => runner.run(["file.txt"]));
			expect(resolverCalled).toBe(false);
			expect(results.results[0].resolution).toBeUndefined();
		});
	});

	describe("generator-based handlers", () => {
		it("should execute Operation-based policy handlers", async () => {
			const testPolicy = policy({
				name: "GeneratorPolicy",
				description: "Uses generators",
				match: /\.txt$/,
				handler: function* () {
					yield* (function* () {})();
					return true;
				},
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [testPolicy] }),
			);
			const results = await run(() => runner.run(["file.txt"]));
			expect(results.results).toEqual([]);
		});

		it("should handle failures from generator-based handlers", async () => {
			const testPolicy = policy({
				name: "FailGen",
				description: "Fails via generator",
				match: /\.txt$/,
				handler: function* (): Generator<unknown, PolicyError, unknown> {
					yield* (function* () {})();
					return { error: "generator error" };
				},
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [testPolicy] }),
			);
			const results = await run(() => runner.run(["file.txt"]));
			expect(results.results).toHaveLength(1);
			expect(results.results[0].outcome).toMatchObject({
				error: "generator error",
			});
		});
	});

	describe("error handling", () => {
		it("should report a system error and continue when a handler throws", async () => {
			const processedFiles: string[] = [];
			const testPolicy = policy({
				name: "ThrowPolicy",
				description: "Throws",
				match: /\.txt$/,
				handler: async ({ file }) => {
					processedFiles.push(file);
					if (file === "bad.txt") {
						throw new Error("handler boom");
					}
					return true;
				},
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [testPolicy] }),
			);

			const results = await run(() => runner.run(["bad.txt", "good.txt"]));

			expect(processedFiles).toEqual(["bad.txt", "good.txt"]);
			expect(results.results).toEqual([
				{
					file: "bad.txt",
					policy: "ThrowPolicy",
					outcome: {
						error:
							"System Error: Error executing policy 'ThrowPolicy' for file 'bad.txt': handler boom",
					},
				},
			]);
		});
	});

	describe("performance tracking", () => {
		it("should track handler execution time", async () => {
			const testPolicy = policy({
				name: "PerfPolicy",
				description: "Tracked",
				match: /\.txt$/,
				handler: async () => true,
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [testPolicy] }),
			);
			const results = await run(() => runner.run(["file.txt"]));

			const handleMap = results.perfStats.data.get("handle");
			expect(handleMap).toBeDefined();
			expect(handleMap?.has("PerfPolicy")).toBe(true);
		});
	});
});

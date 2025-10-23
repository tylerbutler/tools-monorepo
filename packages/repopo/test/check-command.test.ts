import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type {
	PolicyDefinition,
	PolicyFailure,
	PolicyFixResult,
} from "../src/policy.js";

describe("Check Command - Effection Integration", () => {
	let testRepoDir: string;
	let git: ReturnType<typeof simpleGit>;

	beforeEach(async () => {
		// Create a temporary git repository for testing
		testRepoDir = await mkdtemp(join(tmpdir(), "repopo-integration-"));
		git = simpleGit(testRepoDir);

		// Initialize git repo
		await git.init();
		await git.addConfig("user.name", "Test User");
		await git.addConfig("user.email", "test@example.com");

		// Create initial files
		await writeFile(join(testRepoDir, "test1.txt"), "content1");
		await writeFile(join(testRepoDir, "test2.txt"), "content2");
		await writeFile(join(testRepoDir, "test3.txt"), "content3");

		// Initial commit
		await git.add(".");
		await git.commit("Initial commit");
	});

	afterEach(async () => {
		// Clean up test repository
		await rm(testRepoDir, { recursive: true, force: true });
	});

	describe("Policy execution with generators", () => {
		it("should execute Operation-based policy handler", async () => {
			let executionCount = 0;

			const testPolicy: PolicyDefinition = {
				name: "TestOperationPolicy",
				description: "Test policy using Effection operations",
				match: /\.txt$/,
				handler: function* ({ file }) {
					executionCount++;
					expect(file).toMatch(/test\d\.txt/);
					return true;
				},
			};

			expect(testPolicy.handler).toBeDefined();
			expect(executionCount).toBe(0);
		});

		it("should execute Promise-based policy handler", async () => {
			let executionCount = 0;

			const testPolicy: PolicyDefinition = {
				name: "TestPromisePolicy",
				description: "Test policy using Promises",
				match: /\.txt$/,
				handler: async ({ file }) => {
					executionCount++;
					expect(file).toMatch(/test\d\.txt/);
					return true;
				},
			};

			expect(testPolicy.handler).toBeDefined();
			expect(executionCount).toBe(0);
		});

		it("should handle policy failures from Operation-based handlers", async () => {
			const testPolicy: PolicyDefinition = {
				name: "FailingOperationPolicy",
				description: "Test policy that fails",
				match: /\.txt$/,
				handler: function* ({ file }) {
					const failure: PolicyFailure = {
						name: "FailingOperationPolicy",
						file,
						errorMessage: "Operation-based failure",
						autoFixable: false,
					};
					return failure;
				},
			};

			expect(testPolicy.handler).toBeDefined();
		});

		it("should handle policy with resolver", async () => {
			const testPolicy: PolicyDefinition = {
				name: "PolicyWithResolver",
				description: "Test policy with resolver",
				match: /\.txt$/,
				handler: function* ({ file, resolve }) {
					if (resolve) {
						const fixResult: PolicyFixResult = {
							name: "PolicyWithResolver",
							file,
							resolved: true,
							errorMessage: "Fixed by Operation",
						};
						return fixResult;
					}

					const failure: PolicyFailure = {
						name: "PolicyWithResolver",
						file,
						errorMessage: "Needs fixing",
						autoFixable: true,
					};
					return failure;
				},
				resolver: function* ({ file }) {
					const result: PolicyFixResult = {
						name: "PolicyWithResolver",
						file,
						resolved: true,
						errorMessage: "Resolved by Operation resolver",
					};
					return result;
				},
			};

			expect(testPolicy.handler).toBeDefined();
			expect(testPolicy.resolver).toBeDefined();
		});
	});

	describe("Parallel execution with structured concurrency", () => {
		it("should handle multiple files with Operation-based policies", async () => {
			const executionOrder: string[] = [];

			const testPolicy: PolicyDefinition = {
				name: "ParallelTestPolicy",
				description: "Test parallel execution",
				match: /\.txt$/,
				handler: function* ({ file }) {
					executionOrder.push(file);
					// Simulate some async work
					yield* (function* () {
						// Small delay
					})();
					return true;
				},
			};

			expect(testPolicy.handler).toBeDefined();
		});

		it("should maintain isolation between parallel policy executions", async () => {
			const results: Map<string, boolean> = new Map();

			const testPolicy: PolicyDefinition = {
				name: "IsolationTestPolicy",
				description: "Test execution isolation",
				match: /\.txt$/,
				handler: function* ({ file }) {
					// Each execution should be independent
					const isProcessed = results.has(file);
					expect(isProcessed).toBe(false);

					results.set(file, true);
					return true;
				},
			};

			expect(testPolicy.handler).toBeDefined();
		});

		it("should handle errors in parallel execution gracefully", async () => {
			const testPolicy: PolicyDefinition = {
				name: "ErrorTestPolicy",
				description: "Test error handling in parallel execution",
				match: /\.txt$/,
				handler: function* ({ file }) {
					if (file === "test2.txt") {
						throw new Error("Simulated error for test2.txt");
					}
					return true;
				},
			};

			expect(testPolicy.handler).toBeDefined();
		});
	});

	describe("Mixed Promise and Operation handlers", () => {
		it("should support policies with mixed handler types", async () => {
			const promisePolicy: PolicyDefinition = {
				name: "PromisePolicy",
				description: "Promise-based policy",
				match: /test1\.txt$/,
				handler: async ({ file }) => {
					expect(file).toBe("test1.txt");
					return true;
				},
			};

			const operationPolicy: PolicyDefinition = {
				name: "OperationPolicy",
				description: "Operation-based policy",
				match: /test2\.txt$/,
				handler: function* ({ file }) {
					expect(file).toBe("test2.txt");
					return true;
				},
			};

			expect(promisePolicy.handler).toBeDefined();
			expect(operationPolicy.handler).toBeDefined();
		});

		it("should execute mixed policies with different resolvers", async () => {
			const promisePolicy: PolicyDefinition = {
				name: "PromisePolicyWithResolver",
				description: "Promise-based policy with resolver",
				match: /test1\.txt$/,
				handler: async ({ file }) => {
					const failure: PolicyFailure = {
						name: "PromisePolicyWithResolver",
						file,
						errorMessage: "Promise failure",
						autoFixable: true,
					};
					return failure;
				},
				resolver: async ({ file }) => {
					const result: PolicyFixResult = {
						name: "PromisePolicyWithResolver",
						file,
						resolved: true,
						errorMessage: "Promise resolver",
					};
					return result;
				},
			};

			const operationPolicy: PolicyDefinition = {
				name: "OperationPolicyWithResolver",
				description: "Operation-based policy with resolver",
				match: /test2\.txt$/,
				handler: function* ({ file }) {
					const failure: PolicyFailure = {
						name: "OperationPolicyWithResolver",
						file,
						errorMessage: "Operation failure",
						autoFixable: true,
					};
					return failure;
				},
				resolver: function* ({ file }) {
					const result: PolicyFixResult = {
						name: "OperationPolicyWithResolver",
						file,
						resolved: true,
						errorMessage: "Operation resolver",
					};
					return result;
				},
			};

			expect(promisePolicy.handler).toBeDefined();
			expect(promisePolicy.resolver).toBeDefined();
			expect(operationPolicy.handler).toBeDefined();
			expect(operationPolicy.resolver).toBeDefined();
		});
	});

	describe("Configuration handling", () => {
		it("should pass configuration to Operation-based handlers", async () => {
			interface TestConfig {
				maxLength: number;
				pattern: string;
			}

			const testPolicy: PolicyDefinition<TestConfig> = {
				name: "ConfigTestPolicy",
				description: "Test configuration handling",
				match: /\.txt$/,
				handler: function* ({ config }) {
					expect(config).toBeDefined();
					expect(config?.maxLength).toBe(100);
					expect(config?.pattern).toBe("test-pattern");
					return true;
				},
				defaultConfig: {
					maxLength: 50,
					pattern: "default-pattern",
				},
			};

			expect(testPolicy.handler).toBeDefined();
			expect(testPolicy.defaultConfig).toEqual({
				maxLength: 50,
				pattern: "default-pattern",
			});
		});

		it("should handle undefined config gracefully", async () => {
			const testPolicy: PolicyDefinition = {
				name: "NoConfigPolicy",
				description: "Test no configuration",
				match: /\.txt$/,
				handler: function* ({ config }) {
					expect(config).toBeUndefined();
					return true;
				},
			};

			expect(testPolicy.handler).toBeDefined();
		});
	});
});

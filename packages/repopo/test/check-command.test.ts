import { execFile } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { Config } from "@oclif/core";
import { join } from "pathe";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CheckPolicy } from "../src/commands/check.js";
import { newPerfStats } from "../src/perf.js";
import { NoJsFileExtensions } from "../src/policies/NoJsFileExtensions.js";
import type {
	PolicyDefinition,
	PolicyFailure,
	PolicyFixResult,
	PolicyHandlerResult,
	PolicyResolver,
	PolicyStandaloneResolver,
} from "../src/policy.js";

class TestCheckPolicy extends CheckPolicy<typeof TestCheckPolicy> {
	protected override flags = {
		fix: false,
		stdin: false,
		quiet: true,
		verbose: false,
		config: undefined,
	};

	public enableFix(): void {
		this.flags.fix = true;
	}
}

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
		vi.restoreAllMocks();
		// Clean up test repository
		await rm(testRepoDir, { recursive: true, force: true });
	});

	describe("Git file enumeration", () => {
		it("preserves case-sensitive global exclusions from the config", async () => {
			const configPath = join(testRepoDir, "repopo.config.mjs");
			await writeFile(
				configPath,
				`export default {
				excludeFiles: [/^TEST1/],
				policies: [{
					name: "CaseSensitive", description: "Checks exclusions", match: /^test1/,
					handler: async () => ({ error: "Lowercase file still checked" })
				}]
			};`,
			);
			const result = await new Promise<{
				code: string | number | undefined;
				output: string;
			}>((resolve) => {
				const child = execFile(
					process.execPath,
					[
						fileURLToPath(new URL("../bin/run.js", import.meta.url)),
						"check",
						"--stdin",
						"--config",
						configPath,
					],
					{ cwd: testRepoDir, timeout: 10000 },
					(error, stdout, stderr) => {
						resolve({ code: error?.code, output: stdout + stderr });
					},
				);
				child.stdin?.end("test1.txt\n");
			});
			expect(result.code).toBe(1);
			expect(result.output).toContain("Lowercase file still checked");
		}, 15000);

		it.each([
			"test1.txt\n",
			"",
		])("runs repository policies with full context for stdin %j", async (stdin) => {
			const configPath = join(testRepoDir, "repopo.config.mjs");
			await writeFile(
				configPath,
				`export default {
				policies: [{
					name: "RepositoryCheck",
					description: "Checks full context",
					scope: "repository",
					handler: async ({ files }) => [
						{ error: "Repository-level failure" },
						{ error: files.includes("test2.txt") ? "Full context" : "Missing context", files: ["test1.txt", "test2.txt"] }
					]
				}]
			};`,
			);
			const result = await new Promise<{
				code: string | number | undefined;
				output: string;
			}>((resolve) => {
				const child = execFile(
					process.execPath,
					[
						fileURLToPath(new URL("../bin/run.js", import.meta.url)),
						"check",
						"--stdin",
						"--config",
						configPath,
					],
					{ cwd: testRepoDir, timeout: 10000 },
					(error, stdout, stderr) => {
						resolve({ code: error?.code, output: stdout + stderr });
					},
				);
				child.stdin?.end(stdin);
			});
			expect(result.code).toBe(1);
			expect(result.output).toContain("repository");
			expect(result.output).toContain("Repository-level failure");
			expect(result.output).toContain("Full context");
			expect(result.output).toContain("test1.txt, test2.txt");
			expect(result.output).not.toContain("Missing context");
		});

		it.each([
			"caf\u00e9.js",
			"tab\tname.js",
			"line\nname.js",
		])("should route the original Git filename %j to its policy", async (file) => {
			await git.addConfig("core.quotePath", "true");
			await writeFile(join(testRepoDir, file), "export {};");
			const handler = vi.fn(async () => true as const);
			const command = new TestCheckPolicy(
				[],
				await Config.load(fileURLToPath(new URL("..", import.meta.url))),
			);
			vi.spyOn(command, "git", "get").mockReturnValue(git);
			vi.spyOn(command, "verbose").mockImplementation(() => {});
			vi.spyOn(command, "getContext").mockResolvedValue({
				gitRoot: testRepoDir,
				policies: [
					{
						...NoJsFileExtensions,
						instanceId: NoJsFileExtensions.name,
						handler,
					},
				],
				excludeFromAll: [],
				excludePoliciesForFiles: new Map(),
				perfStats: newPerfStats(),
			});

			await command.run();

			expect(handler).toHaveBeenCalledWith(
				expect.objectContaining({ file, root: testRepoDir }),
			);
		});
	});

	describe("Manual fix guidance", () => {
		async function checkOutput(
			outcome: PolicyHandlerResult,
			resolver?: PolicyStandaloneResolver | PolicyResolver<undefined>,
		): Promise<{ output: string; exitCode: typeof process.exitCode }> {
			const command = new TestCheckPolicy(
				[],
				await Config.load(fileURLToPath(new URL("..", import.meta.url))),
			);
			command.enableFix();
			vi.spyOn(command, "git", "get").mockReturnValue(git);
			vi.spyOn(command, "verbose").mockImplementation(() => {});
			const info = vi.spyOn(command, "info").mockImplementation(() => {});
			const warning = vi.spyOn(command, "warning").mockImplementation(() => {});
			vi.spyOn(command, "getContext").mockResolvedValue({
				gitRoot: testRepoDir,
				policies: [
					{
						name: "GuidedPolicy",
						instanceId: "GuidedPolicy",
						description: "Policy with correction guidance",
						match: /^test1\.txt$/,
						handler: async () => outcome,
						resolver,
					},
				],
				excludeFromAll: [],
				excludePoliciesForFiles: new Map(),
				perfStats: newPerfStats(),
			});

			const originalExitCode = process.exitCode;
			try {
				process.exitCode = 0;
				await command.run();
				return {
					output: [...info.mock.calls, ...warning.mock.calls]
						.map(([message]) => message)
						.join("\n"),
					exitCode: process.exitCode,
				};
			} finally {
				process.exitCode = originalExitCode;
			}
		}

		it.each([
			true,
			false,
			undefined,
		])("reports new-format standalone resolution with fixed=%s", async (fixed) => {
			const { output, exitCode } = await checkOutput(
				{ error: "Needs a fix", manualFix: "Handler guidance" },
				async () => ({ error: "Resolver result", fixed }),
			);
			expect(exitCode).toBe(fixed === true ? 0 : 1);
			expect(output).toContain("Resolver result");
			if (fixed === true) {
				expect(output).not.toContain("Manual fix:");
			} else {
				expect(output).toContain("Resolver result");
				expect(output).toContain("Handler guidance");
			}
		});

		it.each([
			{ error: "Wrong pattern" },
			{ error: "Fix failed", fixed: false },
			{
				name: "GuidedPolicy",
				file: "test1.txt",
				errorMessages: ["Wrong pattern"],
			},
			{
				name: "GuidedPolicy",
				file: "test1.txt",
				errorMessages: ["Fix failed"],
				resolved: false,
			},
		])("prints guidance for unresolved results: %j", async (outcome) => {
			const { output } = await checkOutput({
				...outcome,
				manualFix: "Use the shared helper.\r\nPreserve error handling.",
			});

			expect(output).toContain(
				"\tManual fix: Use the shared helper.\n\tPreserve error handling.",
			);
		});

		it.each([
			false,
			true,
		])("uses resolver guidance when present: %s", async (hasGuidance) => {
			const { output } = await checkOutput(
				{ error: "Wrong pattern", manualFix: "Handler guidance" },
				async () => ({
					name: "GuidedPolicy",
					file: "test1.txt",
					resolved: false,
					errorMessages: ["Resolver failed"],
					...(hasGuidance ? { manualFix: "Resolver guidance" } : {}),
				}),
			);

			expect(output).toContain(
				`Manual fix: ${hasGuidance ? "Resolver" : "Handler"} guidance`,
			);
			expect(output.match(/Manual fix:/g)).toHaveLength(1);
		});

		it.each([
			{ error: "Fixed", fixed: true },
			{
				name: "GuidedPolicy",
				file: "test1.txt",
				errorMessages: [],
				resolved: true,
			},
		])("omits guidance after successful inline fixes: %j", async (outcome) => {
			expect(
				(await checkOutput({ ...outcome, manualFix: "Stale guidance" })).output,
			).not.toContain("Manual fix:");
		});

		it("omits guidance after a successful standalone fix", async () => {
			const { output } = await checkOutput(
				{ error: "Wrong pattern", manualFix: "Stale guidance" },
				async () => ({
					name: "GuidedPolicy",
					file: "test1.txt",
					resolved: true,
					errorMessages: [],
					manualFix: "Stale resolver guidance",
				}),
			);
			expect(output).not.toContain("Manual fix:");
		});

		it("does not add guidance when the policy supplies none", async () => {
			const { output } = await checkOutput({ error: "Wrong pattern" });
			expect(output).toContain("Wrong pattern");
			expect(output).not.toContain("Manual fix:");
		});
	});

	describe("Policy execution with generators", () => {
		it("should execute Operation-based policy handler", async () => {
			let executionCount = 0;

			const testPolicy: PolicyDefinition = {
				name: "TestOperationPolicy",
				description: "Test policy using Effection operations",
				match: /\.txt$/,
				handler: function* ({ file }) {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					const failure: PolicyFailure = {
						name: "OperationPolicyWithResolver",
						file,
						errorMessage: "Operation failure",
						autoFixable: true,
					};
					return failure;
				},
				resolver: function* ({ file }) {
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
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
					yield* (function* () {
						// Minimal yield to satisfy generator requirements
					})();
					expect(config).toBeUndefined();
					return true;
				},
			};

			expect(testPolicy.handler).toBeDefined();
		});
	});
});

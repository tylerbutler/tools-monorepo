import { all, run } from "effection";
import { describe, expect, it, vi } from "vitest";

import { makePolicy, policy } from "../src/makePolicy.js";
import type {
	PolicyError,
	PolicyFailure,
	PolicyFixResult,
	PolicyResolver,
	PolicyShape,
	RepositoryPolicyArgs,
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
	describe("configuration", () => {
		it.each([
			"file",
			"repository",
		] as const)("keeps exclude-shaped %s configuration separate from options", async (scope) => {
			const configs: unknown[] = [];
			const files: string[] = [];
			const common = {
				name: "Configured",
				description: "Checks configuration delivery",
				defaultConfig: { exclude: ["default"] },
			};
			const configured =
				scope === "file"
					? policy(
							{
								...common,
								match: /.*/,
								handler: async ({ file, config }) => {
									files.push(file);
									configs.push(config);
									return true;
								},
							},
							{ exclude: ["keep.txt"] },
						)
					: policy(
							{
								...common,
								scope: "repository",
								handler: async ({ files: inventory, config }) => {
									files.push(...inventory);
									configs.push(config);
									return true;
								},
							},
							{ exclude: ["keep.txt"] },
						);
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [configured],
				}),
			);

			await run(() => runner.run(["keep.txt"]));

			expect(files).toEqual(["keep.txt"]);
			expect(configs).toEqual([{ exclude: ["keep.txt"] }]);
		});

		it.each([
			"file",
			"repository",
		] as const)("applies legacy %s defaults, settings config, and explicit overrides", async (scope) => {
			const configs: unknown[] = [];
			const common = {
				name: "Legacy",
				description: "Checks legacy configuration delivery",
				defaultConfig: { threshold: 10 },
				handler: async ({ config }: { config?: { threshold: number } }) => {
					configs.push(config);
					return true as const;
				},
			};
			const configured = [
				{ config: undefined, settings: undefined },
				{ config: undefined, settings: { config: { threshold: 20 } } },
				{ config: { threshold: 30 }, settings: { config: { threshold: 20 } } },
			].map(({ config, settings }) =>
				scope === "file"
					? makePolicy({ ...common, match: /.*/ }, config, settings)
					: makePolicy({ ...common, scope: "repository" }, config, settings),
			);
			for (const instance of configured) {
				const runner = new PolicyRunner(
					makeRunnerOptions({ policies: [instance] }),
				);
				await run(() => runner.run(["file.txt"]));
			}
			expect(configs).toEqual([
				{ threshold: 10 },
				{ threshold: 20 },
				{ threshold: 30 },
			]);
		});
	});

	describe("repository policies", () => {
		it("runs once on the full eligible inventory, independently of the selection", async () => {
			const handler = vi.fn(async () => [
				{ error: "Repository problem" },
				{ error: "Cross-file problem", files: ["a.txt", "b.txt"] },
			]);
			const fileHandler = vi.fn(async () => true as const);
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [
						policy(
							{
								name: "Repo",
								description: "Repo",
								scope: "repository",
								handler,
							},
							undefined,
							{ exclude: ["vendor/"] },
						),
						policy({
							name: "File",
							description: "File",
							match: /\.txt$/,
							handler: fileHandler,
						}),
					],
					excludeFromAll: [/generated/g],
				}),
			);
			const result = await run(() =>
				runner.run(
					["a.txt"],
					[
						"a.txt",
						"b.txt",
						"vendor/c.txt",
						"generated/a.txt",
						"generated/b.txt",
					],
				),
			);
			expect(handler).toHaveBeenCalledExactlyOnceWith({
				root: "/fake/root",
				files: ["a.txt", "b.txt"],
				resolve: false,
				config: undefined,
			});
			expect(fileHandler).toHaveBeenCalledExactlyOnceWith(
				expect.objectContaining({ file: "a.txt" }),
			);
			expect(result.results).toEqual([
				{
					scope: "repository",
					policy: "Repo",
					policyId: "Repo",
					outcome: { error: "Repository problem" },
				},
				{
					scope: "repository",
					policy: "Repo",
					policyId: "Repo",
					outcome: { error: "Cross-file problem", files: ["a.txt", "b.txt"] },
				},
			]);
			expect(result.perfStats.data.get("handle")?.has("Repo")).toBe(true);
		});

		it("runs generator handlers with defaults and instance-specific exclusions on empty selections", async () => {
			const seen: { files: readonly string[]; enabled: boolean | undefined }[] =
				[];
			const definition = {
				name: "Repo",
				description: "Repo",
				scope: "repository" as const,
				defaultConfig: { enabled: true },
				handler: function* ({
					files,
					config,
				}: RepositoryPolicyArgs<{ enabled: boolean }>) {
					seen.push({ files, enabled: config?.enabled });
					yield* all([]);
					return true as const;
				},
			};
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [
						policy(definition, undefined, {
							exclude: ["a"],
							instanceId: "first",
						}),
						policy(
							definition,
							{ enabled: false },
							{ exclude: ["b"], instanceId: "second" },
						),
					],
				}),
			);
			await run(() => runner.run([], ["a", "b"]));
			await run(() => runner.run([], []));
			expect(seen).toEqual([
				{ files: ["b"], enabled: true },
				{ files: ["a"], enabled: false },
				{ files: [], enabled: true },
				{ files: [], enabled: false },
			]);
		});

		it("finishes file fixes first and refreshes inventory before each serial repository fixer", async () => {
			const files: string[] = ["original.txt"];
			const order: string[] = [];
			const inventory = vi.fn(async () => [...files]);
			const runner = new PolicyRunner(
				makeRunnerOptions({
					resolve: true,
					policies: [
						policy({
							name: "Repo1",
							description: "Repo1",
							scope: "repository",
							handler: async ({ files: current, resolve }) => {
								expect(current).toContain("file-fix.txt");
								expect(resolve).toBe(true);
								order.push("repo1");
								await Promise.resolve();
								files.push("repo-fix.txt");
								return [{ error: "Created file", fixed: true }];
							},
						}),
						policy({
							name: "File",
							description: "File",
							match: /\.txt$/,
							handler: async () => {
								order.push("file");
								files.push("file-fix.txt");
								return true;
							},
						}),
						policy({
							name: "Repo2",
							description: "Repo2",
							scope: "repository",
							handler: async ({ files: current }) => {
								expect(current).toContain("repo-fix.txt");
								order.push("repo2");
								return true;
							},
						}),
					],
				}),
			);
			await run(() => runner.run(["original.txt"], inventory));
			expect(order).toEqual(["file", "repo1", "repo2"]);
			expect(inventory).toHaveBeenCalledTimes(2);
		});

		it("reports repository handler errors and continues to subsequent policies", async () => {
			const next = vi.fn(async () => true as const);
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [
						policy({
							name: "Broken",
							description: "Broken",
							scope: "repository",
							handler: async () => {
								throw new Error("Cannot read manifest");
							},
						}),
						policy({
							name: "Next",
							description: "Next",
							scope: "repository",
							handler: next,
						}),
					],
				}),
			);
			const result = await run(() => runner.run([]));
			expect(result.results).toEqual([
				expect.objectContaining({
					scope: "repository",
					outcome: { error: expect.stringContaining("Cannot read manifest") },
				}),
			]);
			expect(next).toHaveBeenCalledOnce();
		});
	});

	describe("run", () => {
		it("should preserve every same-file fix across asynchronous handlers", async () => {
			let contents: { license?: string; scripts?: { test: string } } = {};
			const runner = new PolicyRunner(
				makeRunnerOptions({
					resolve: true,
					policies: [
						policy({
							name: "AddLicense",
							description: "Adds a license to the stored document",
							match: /package\.json$/,
							handler: async () => {
								const snapshot = structuredClone(contents);
								await Promise.resolve();
								contents = { ...snapshot, license: "MIT" };
								return { error: "Missing license", fixed: true };
							},
						}),
						policy({
							name: "AddTestScript",
							description: "Adds a test script to the stored document",
							match: /package\.json$/,
							handler: async () => {
								const snapshot = structuredClone(contents);
								await Promise.resolve();
								contents = { ...snapshot, scripts: { test: "vitest" } };
								return { error: "Missing test script", fixed: true };
							},
						}),
					],
				}),
			);

			const results = await run(() => runner.run(["package.json"]));

			expect(results.results).toHaveLength(2);
			expect(contents).toEqual({
				license: "MIT",
				scripts: { test: "vitest" },
			});
		});

		it("should return empty results for no files", async () => {
			const runner = new PolicyRunner(makeRunnerOptions());
			const results = await run(() => runner.run([]));
			expect(results.results).toEqual([]);
			expect(results.perfStats.count).toBe(0);
			expect(results.perfStats.processed).toBe(0);
		});

		it("should count all processed files", async () => {
			const runner = new PolicyRunner(makeRunnerOptions());
			const results = await run(() => runner.run(["a.txt", "b.txt", "c.txt"]));
			expect(results.perfStats.count).toBe(3);
			expect(results.perfStats.processed).toBe(3);
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
		it.each([
			{ pattern: /^README/, excluded: "README.md", included: "readme.md" },
			{ pattern: /^skip$/m, excluded: "prefix\nskip", included: "skip.txt" },
			{ pattern: "vendor/", excluded: "VENDOR/file.txt", included: "file.txt" },
		])("preserves configured exclusion semantics for $pattern", async ({
			pattern,
			excluded,
			included,
		}) => {
			const files: string[] = [];
			const configured = policy(
				{
					name: "Exclusions",
					description: "Checks configured exclusions",
					match: /./s,
					handler: async ({ file }) => {
						files.push(file);
						return true;
					},
				},
				undefined,
				{ exclude: [pattern] },
			);
			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [configured] }),
			);
			await run(() => runner.run([excluded, included]));
			expect(files).toEqual([included]);
		});

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
			expect(results.perfStats.count).toBe(1);
			expect(results.perfStats.processed).toBe(0);
		});

		it("should only process files admitted past global exclusions", async () => {
			const handledFiles: string[] = [];
			const testPolicy = policy({
				name: "TestPolicy",
				description: "Test",
				match: /\.txt$/,
				handler: async ({ file }) => {
					handledFiles.push(file);
					return true;
				},
			});

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [testPolicy],
					excludeFromAll: [/generated/],
				}),
			);

			const results = await run(() =>
				runner.run(["file.txt", "generated/output.txt", "README.md"]),
			);
			expect(handledFiles).toEqual(["file.txt"]);
			expect(results.perfStats.count).toBe(3);
			expect(results.perfStats.processed).toBe(2);
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
			expect(results.perfStats.count).toBe(1);
			expect(results.perfStats.processed).toBe(1);
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

		it("should keep duplicate policy configurations and exclusions independent", async () => {
			const calls: string[] = [];
			const duplicatePolicy: PolicyShape<{ label: string }> = {
				name: "DuplicatePolicy",
				description: "Configured more than once",
				match: /\.txt$/,
				handler: async ({ config, file }): Promise<PolicyError> => {
					calls.push(`${config?.label}:${file}`);
					return { error: config?.label ?? "missing config" };
				},
			};
			const policies = [
				policy(
					duplicatePolicy,
					{ label: "first" },
					{ exclude: ["first-only"], instanceId: "first-instance" },
				),
				policy(
					duplicatePolicy,
					{ label: "second" },
					{ exclude: ["second-only"], instanceId: "second-instance" },
				),
			];
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies,
				}),
			);

			const results = await run(() =>
				runner.run(["first-only.txt", "second-only.txt", "shared.txt"]),
			);

			expect(calls).toEqual(
				expect.arrayContaining([
					"second:first-only.txt",
					"first:second-only.txt",
					"first:shared.txt",
					"second:shared.txt",
				]),
			);
			expect(calls).toHaveLength(4);
			expect(results.results.map((result) => result.policyId).sort()).toEqual([
				"first-instance",
				"first-instance",
				"second-instance",
				"second-instance",
			]);
			expect(
				[...(results.perfStats.data.get("handle")?.keys() ?? [])].sort(),
			).toEqual(["first-instance", "second-instance"]);
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

		it("should count a file once when duplicate policy instances match it", async () => {
			let handlerCalls = 0;
			const duplicatePolicy: PolicyShape = {
				name: "DuplicatePolicy",
				description: "Matches the same file twice",
				match: /\.txt$/,
				handler: async () => {
					handlerCalls++;
					return true;
				},
			};

			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [
						policy(duplicatePolicy, undefined, {
							instanceId: "first-instance",
						}),
						policy(duplicatePolicy, undefined, {
							instanceId: "second-instance",
						}),
					],
				}),
			);

			const results = await run(() => runner.run(["file.txt"]));
			expect(handlerCalls).toBe(2);
			expect(results.results).toEqual([]);
			expect(results.perfStats.count).toBe(1);
			expect(results.perfStats.processed).toBe(1);
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
		it.each([
			{ kind: "async", fixed: true },
			{ kind: "generator", fixed: false },
			{ kind: "async", fixed: undefined },
		])("normalizes $kind PolicyResolver results with fixed=$fixed", async ({
			kind,
			fixed,
		}) => {
			const result: PolicyError = {
				error: "Resolver result",
				fixed,
				manualFix: "Manual correction",
			};
			const resolver: PolicyResolver =
				kind === "async"
					? async () => result
					: function* () {
							yield* all([]);
							return result;
						};
			const definition: PolicyShape = {
				name: "Resolver",
				description: "Checks the new resolver format",
				match: /\.txt$/,
				handler: async () => ({ error: "Needs a fix" }),
				resolver,
			};
			const runner = new PolicyRunner(
				makeRunnerOptions({
					policies: [policy(definition)],
					resolve: true,
				}),
			);
			const { results } = await run(() => runner.run(["file.txt"]));
			expect(results).toEqual([
				expect.objectContaining({
					resolution: {
						name: "Resolver",
						file: "file.txt",
						resolved: fixed === true,
						errorMessages: ["Resolver result"],
						autoFixable: undefined,
						manualFix: "Manual correction",
					},
				}),
			]);
		});

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
			const testPolicy = policy(
				{
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
				},
				undefined,
				{ instanceId: "throw-instance" },
			);

			const runner = new PolicyRunner(
				makeRunnerOptions({ policies: [testPolicy] }),
			);

			const results = await run(() => runner.run(["bad.txt", "good.txt"]));

			expect(processedFiles).toEqual(["bad.txt", "good.txt"]);
			expect(results.results).toEqual([
				{
					file: "bad.txt",
					policy: "ThrowPolicy",
					policyId: "throw-instance",
					outcome: {
						error:
							"System Error: Error executing policy 'throw-instance' for file 'bad.txt': handler boom",
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

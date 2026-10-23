import { all, call, ensure, run, sleep } from "effection";
import { describe, expect, it, vi } from "vitest";
import { makePolicy } from "../src/makePolicy.js";
import type {
	FilePolicyDefinition,
	PolicyResult,
	RepositoryPolicyDefinition,
} from "../src/policy.js";
import { PolicyRunner, runPolicies } from "../src/runner.js";

const fileDefinition = {
	name: "File",
	description: "Checks files",
	match: /\.txt$/,
	handler: async () => [],
} satisfies FilePolicyDefinition;
const repositoryDefinition = {
	name: "Repository",
	description: "Checks repository",
	scope: "repository",
	handler: async () => [],
} satisfies RepositoryPolicyDefinition;
const root = "/repo";

describe("canonical policy execution", () => {
	it.each([
		"file",
		"repository",
	] as const)("rejects invalid later structural %s exclusions before any loader, handler or resolver", (scope) => {
		const handler = vi.fn(async () => [{ message: "needs fix" }]);
		const resolver = vi.fn(async () => []);
		const inventory = vi.fn(async () => ["a.txt"]);
		const later = scope === "file" ? fileDefinition : repositoryDefinition;
		expect(
			() =>
				new PolicyRunner({
					root,
					fix: true,
					inventory,
					policies: [
						makePolicy({ ...fileDefinition, name: "First", handler, resolver }),
						{ ...later, exclude: ["["] },
					],
				}),
		).toThrow(SyntaxError);
		expect(handler).not.toHaveBeenCalled();
		expect(resolver).not.toHaveBeenCalled();
		expect(inventory).not.toHaveBeenCalled();
	});

	it("retains independent messages, manual guidance, fixed findings and runner-owned scope/identity", async () => {
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			inventory: [],
			fix: true,
			policies: [
				makePolicy(
					{
						...fileDefinition,
						handler: async () => [
							{ message: "first", manualFix: "edit manually" },
							{ message: "second", fixStatus: "fixed" },
							{ message: "third", fixStatus: "failed" },
						],
					},
					{ instanceId: "file-one" },
				),
				makePolicy({
					...repositoryDefinition,
					handler: async () => [
						{ message: "repository wide" },
						{ message: "several files", files: ["a.txt", "b.txt"] },
					],
				}),
			],
		});
		expect(result.errors).toEqual([]);
		expect(result.findings).toEqual([
			{
				scope: "file",
				policy: "File",
				policyId: "file-one",
				file: "one.txt",
				message: "first",
				manualFix: "edit manually",
			},
			{
				scope: "file",
				policy: "File",
				policyId: "file-one",
				file: "one.txt",
				message: "second",
				fixStatus: "fixed",
			},
			{
				scope: "file",
				policy: "File",
				policyId: "file-one",
				file: "one.txt",
				message: "third",
				fixStatus: "failed",
			},
			{
				scope: "repository",
				policy: "Repository",
				policyId: "Repository",
				message: "repository wide",
			},
			{
				scope: "repository",
				policy: "Repository",
				policyId: "Repository",
				message: "several files",
				files: ["a.txt", "b.txt"],
			},
		]);
	});

	it.each([
		"promise",
		"generator",
	] as const)("preserves hostile original causes from a %s without coercion or dropping independent work", async (mode) => {
		const getter = vi.fn(() => {
			throw new Error("must not inspect");
		});
		const cause = Proxy.revocable({}, { getPrototypeOf: getter });
		cause.revoke();
		const handler =
			mode === "promise"
				? async () => {
						throw cause.proxy;
					}
				: function* () {
						yield* sleep(0);
						throw cause.proxy;
					};
		const result = await runPolicies({
			root,
			files: ["a.txt"],
			inventory: [],
			policies: [
				makePolicy({ ...fileDefinition, handler }),
				makePolicy({
					...fileDefinition,
					name: "Independent",
					handler: async () => [{ message: "survived" }],
				}),
				makePolicy({ ...repositoryDefinition, handler }),
			],
		});
		expect(result.errors).toHaveLength(2);
		expect(result.errors.every((error) => error.cause === cause.proxy)).toBe(
			true,
		);
		expect(result.errors.every((error) => error.kind === "exception")).toBe(
			true,
		);
		expect(result.findings).toMatchObject([
			{ policyId: "Independent", message: "survived" },
		]);
		expect(getter).not.toHaveBeenCalled();
	});

	it.each([
		true,
		undefined,
		{},
		{ error: "old" },
		{ errorMessages: ["old"] },
		[{ message: "ok", typo: true }],
		[{ message: 1 }],
		[null],
		[{ message: "" }],
		[{ message: "bad", fixStatus: "unknown" }],
		[{ message: "bad", manualFix: 123 }],
		[{ message: "bad", files: ["/absolute"] }],
		[{ message: "bad", files: ["../outside"] }],
		[{ message: "bad", files: ["a\\b"] }],
		[{ message: "bad", files: [""] }],
		[{ message: "bad", files: ["."] }],
		[{ message: "bad", files: ["a//b"] }],
		[{ message: "bad", files: ["a/../b"] }],
		[{ message: "bad", files: ["C:/drive"] }],
		[{ message: "bad", files: ["a\0b"] }],
		[{ message: "bad", files: "file.txt" }],
		[{ message: "bad", files: [123] }],
	])("reports malformed and legacy results as structured contract errors: %j", async (value) => {
		// Reflect exercises the JavaScript boundary without weakening the public handler types.
		const result = await Reflect.apply(runPolicies, undefined, [
			{
				root,
				files: ["one.txt"],
				inventory: [],
				policies: [
					{
						...fileDefinition,
						instanceId: "bad-file",
						handler: async () => value,
					},
					{
						...repositoryDefinition,
						instanceId: "bad-repo",
						handler: async () => value,
					},
				],
			},
		]);
		expect(result.findings).toEqual([]);
		expect(result.errors).toHaveLength(2);
		expect(result.errors.map((error: { kind: string }) => error.kind)).toEqual([
			"contract",
			"contract",
		]);
	});

	it.each([
		"fixed",
		"failed",
	] as const)("rejects %s in check mode in both scopes", async (fixStatus) => {
		const handler = async (): Promise<PolicyResult> => [
			{ message: "illegal", fixStatus },
		];
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			inventory: [],
			policies: [
				makePolicy({ ...fileDefinition, handler }),
				makePolicy({ ...repositoryDefinition, handler }),
			],
		});
		expect(result.errors).toHaveLength(2);
		expect(result.errors.every((error) => error.kind === "contract")).toBe(
			true,
		);
	});

	it("forbids file-handler locations, while repository locations may be empty", async () => {
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			inventory: [],
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async () => [{ message: "bad", files: ["a"] }],
				}),
				makePolicy({
					...repositoryDefinition,
					handler: async () => [
						{ message: "valid", files: [] },
						{ message: "unlocated", files: undefined },
					],
				}),
			],
		});
		expect(result.errors).toHaveLength(1);
		expect(result.findings).toMatchObject([
			{ scope: "repository", files: [] },
			{ scope: "repository", files: undefined },
		]);
	});

	it.each([
		"fixed",
		"failed",
	] as const)("never calls standalone resolvers after an inline %s attempt", async (fixStatus) => {
		const resolver = vi.fn(async () => []);
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			fix: true,
			policies: [
				makePolicy({
					...fileDefinition,
					resolver,
					handler: async () => [
						{ message: "attempted", fixStatus },
						{ message: "still unresolved" },
					],
				}),
			],
		});
		expect(resolver).not.toHaveBeenCalled();
		expect(result.findings).toHaveLength(2);
	});

	it("passes findings to a generator resolver, preserves omitted unresolved work and records fixes", async () => {
		const policy = {
			...fileDefinition,
			handler: async (): Promise<PolicyResult> => [
				{ message: "one", fixStatus: "available", manualFix: "old guidance" },
				{ message: "two" },
			],
			resolver: function* ({ findings }) {
				yield* sleep(1);
				expect(findings).toHaveLength(2);
				return [
					{ ...findings[0], message: "one", fixStatus: "fixed" as const },
					{ message: "three" },
				];
			},
		} satisfies FilePolicyDefinition;
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			fix: true,
			policies: [makePolicy(policy)],
		});
		expect(result.errors).toEqual([]);
		expect(
			result.findings.map(({ message, fixStatus }) => ({ message, fixStatus })),
		).toEqual([
			{ message: "one", fixStatus: "fixed" },
			{ message: "two", fixStatus: undefined },
			{ message: "three", fixStatus: undefined },
		]);
		expect(result.perfStats.data.get("resolve")?.has("File")).toBe(true);
	});

	it("reconciles duplicate messages by occurrence without losing guidance or omitted findings", async () => {
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			fix: true,
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async () => [
						{ message: "duplicate", manualFix: "first guidance" },
						{ message: "duplicate", manualFix: "second guidance" },
						{ message: "omitted" },
					],
					resolver: async () => [
						{ message: "duplicate", fixStatus: "fixed" },
						{ message: "duplicate", fixStatus: "failed" },
					],
				}),
			],
		});
		expect(result.errors).toEqual([]);
		expect(result.findings).toMatchObject([
			{ message: "duplicate", manualFix: "first guidance", fixStatus: "fixed" },
			{
				message: "duplicate",
				manualFix: "second guidance",
				fixStatus: "failed",
			},
			{ message: "omitted" },
		]);
	});

	it("preserves checked findings if a resolver mutates its input and then throws", async () => {
		const cause = new Error("write failed");
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			fix: true,
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async () => [
						{ message: "original", manualFix: "keep this" },
					],
					resolver: async ({ findings }) => {
						for (const finding of findings) {
							finding.message = "mutated";
							finding.fixStatus = "fixed";
						}
						throw cause;
					},
				}),
			],
		});
		expect(result.findings).toMatchObject([
			{ message: "original", manualFix: "keep this" },
		]);
		expect(result.findings[0]?.fixStatus).toBeUndefined();
		expect(result.errors[0]?.cause).toBe(cause);
	});

	it("collects read-only exceptions and continues file and repository work with original causes", async () => {
		const cause = new Error("broken");
		const visited: string[] = [];
		const result = await runPolicies({
			root,
			files: ["a.txt", "b.txt"],
			inventory: [],
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async () => {
						throw cause;
					},
				}),
				makePolicy({
					...fileDefinition,
					name: "After",
					handler: async ({ file }) => {
						visited.push(file);
						return [];
					},
				}),
				makePolicy({
					...repositoryDefinition,
					handler: async () => {
						throw cause;
					},
				}),
				makePolicy({
					...repositoryDefinition,
					name: "AfterRepository",
					handler: async () => [{ message: "done" }],
				}),
			],
		});
		expect(visited).toEqual(["a.txt", "b.txt"]);
		expect(result.errors).toHaveLength(3);
		expect(result.errors.every((error) => error.cause === cause)).toBe(true);
		expect(result.errors[0]).toMatchObject({
			scope: "file",
			file: "a.txt",
			phase: "handle",
			policyId: "File",
		});
		expect(result.errors[2]).toMatchObject({
			scope: "repository",
			files: [],
			policyId: "Repository",
		});
		expect(result.findings[0]?.message).toBe("done");
		expect(result.skipped).toEqual([]);
	});

	it.each([
		"handler",
		"resolver",
	] as const)("stops the current file after a fixer %s exception, continues other files, skips all repository work", async (phase) => {
		const visited: string[] = [];
		const failure: FilePolicyDefinition = {
			...fileDefinition,
			handler: async ({ file }) => {
				if (phase === "handler" && file === "a.txt") {
					throw new Error("write failed");
				}
				return [{ message: "needs fix", fixStatus: "available" }];
			},
			resolver: async ({ file, findings }) => {
				if (phase === "resolver" && file === "a.txt") {
					throw new Error("fixer failed");
				}
				return findings.map((finding) => ({ ...finding, fixStatus: "fixed" }));
			},
		};
		const result = await runPolicies({
			root,
			files: ["a.txt", "b.txt"],
			inventory: [],
			fix: true,
			policies: [
				makePolicy(failure),
				makePolicy({
					...fileDefinition,
					name: "Later",
					handler: async ({ file }) => {
						visited.push(file);
						return [];
					},
				}),
				makePolicy(repositoryDefinition),
				makePolicy({ ...repositoryDefinition, name: "LaterRepo" }),
			],
		});
		expect(visited).toEqual(["b.txt"]);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.phase).toBe(
			phase === "handler" ? "handle" : "resolve",
		);
		expect(result.skipped).toEqual([
			{
				scope: "file",
				file: "a.txt",
				policy: "Later",
				policyId: "Later",
				reason: "file-fix-error",
			},
			{
				scope: "repository",
				policy: "Repository",
				policyId: "Repository",
				reason: "file-fix-error",
			},
			{
				scope: "repository",
				policy: "LaterRepo",
				policyId: "LaterRepo",
				reason: "file-fix-error",
			},
		]);
		expect(
			result.findings.some(
				(finding) => finding.file === "b.txt" && finding.fixStatus === "fixed",
			),
		).toBe(true);
		if (phase === "resolver") {
			expect(
				result.findings.some(
					(finding) =>
						finding.file === "a.txt" && finding.message === "needs fix",
				),
			).toBe(true);
		}
	});

	it("does not stop after ordinary failed findings but skips repository policies after repository fixer exceptions", async () => {
		const after = vi.fn(async () => []);
		const result = await runPolicies({
			root,
			files: ["a.txt"],
			inventory: [],
			fix: true,
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async () => [
						{ message: "ordinary failure", fixStatus: "failed" },
					],
				}),
				makePolicy({
					...repositoryDefinition,
					name: "First",
					handler: async () => [
						{ message: "repo failure", fixStatus: "failed" },
					],
				}),
				makePolicy({
					...repositoryDefinition,
					name: "Throws",
					handler: async () => {
						throw new Error("bad fixer");
					},
				}),
				makePolicy({ ...repositoryDefinition, name: "After", handler: after }),
			],
		});
		expect(result.findings).toHaveLength(2);
		expect(result.errors).toHaveLength(1);
		expect(after).not.toHaveBeenCalled();
		expect(result.skipped).toMatchObject([
			{
				scope: "repository",
				policyId: "After",
				reason: "repository-fix-error",
			},
		]);
	});
});

describe("inventory, selection and regex semantics", () => {
	it("applies defaults and rejects missing required configuration at runner registration", async () => {
		const definition = {
			...fileDefinition,
			requiresConfig: true,
			defaultConfig: { label: "default" },
			handler: async ({ config }) => [{ message: config?.label ?? "missing" }],
		} satisfies FilePolicyDefinition<{ label: string }>;
		const result = await runPolicies({
			root,
			files: ["one.txt"],
			policies: [definition],
		});
		expect(result.findings[0]?.message).toBe("default");
		expect(
			() =>
				new PolicyRunner({
					root,
					policies: [{ ...definition, defaultConfig: undefined }],
				}),
		).toThrow("requires config");
		expect(() =>
			Reflect.construct(PolicyRunner, [
				{
					root,
					inventory: [],
					policies: [{ ...repositoryDefinition, resolver: async () => [] }],
				},
			]),
		).toThrow("inline fixes only");
	});

	it("requires an explicit inventory even when files is provided", () => {
		expect(
			() =>
				new PolicyRunner({
					root,
					files: ["a.txt"],
					policies: [makePolicy(repositoryDefinition)],
				}),
		).toThrow("explicit inventory");
	});
	it("limits only file policies by selection and runs repository policies with an empty eligible inventory", async () => {
		const seen: readonly string[][] = [];
		const handler = vi.fn(async ({ files }: { files: readonly string[] }) => {
			expect(files).toEqual(["b.txt"]);
			return [];
		});
		const result = await runPolicies({
			root,
			inventory: ["a.txt", "b.txt", "vendor/c.txt"],
			files: ["a.txt"],
			exclude: ["vendor/"],
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async ({ file }) => [{ message: file }],
				}),
				makePolicy({ ...repositoryDefinition, handler }, { exclude: ["^a"] }),
			],
		});
		expect(result.findings.map((finding) => finding.message)).toEqual([
			"a.txt",
		]);
		expect(handler).toHaveBeenCalledTimes(1);
		const empty = vi.fn(async () => []);
		await runPolicies({
			root,
			files: [],
			inventory: [],
			policies: [makePolicy({ ...repositoryDefinition, handler: empty })],
		});
		expect(empty).toHaveBeenCalledWith(expect.objectContaining({ files: [] }));
		expect(seen).toEqual([]);
	});
	it("refreshes loaders after file fixes and between repository fixers, without rerunning selected files", async () => {
		const inventory = ["a.txt"];
		const events: string[] = [];
		const loader = vi.fn(async () => {
			events.push("load");
			return [...inventory];
		});
		const result = await runPolicies({
			root,
			inventory: loader,
			files: ["a.txt"],
			fix: true,
			concurrency: 4,
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async () => {
						events.push("file");
						inventory.push("b.txt");
						return [];
					},
				}),
				makePolicy({
					...repositoryDefinition,
					name: "First",
					handler: async ({ files }) => {
						events.push(files.join(","));
						inventory.push("c.txt");
						return [];
					},
				}),
				makePolicy({
					...repositoryDefinition,
					name: "Second",
					handler: async ({ files }) => {
						events.push(files.join(","));
						return [];
					},
				}),
			],
		});
		expect(result.errors).toEqual([]);
		expect(events).toEqual([
			"file",
			"load",
			"a.txt,b.txt",
			"load",
			"a.txt,b.txt,c.txt",
		]);
	});
	it.each([
		/^README/g,
		/^README/y,
		/^README/m,
		"README",
	])("preserves flags and lastIndex for %s exclusions", async (exclude) => {
		if (exclude instanceof RegExp) {
			exclude.lastIndex = 2;
		}
		const result = await runPolicies({
			root,
			files: ["README.txt", "readme.txt"],
			exclude: [exclude],
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async ({ file }) => [{ message: file }],
				}),
			],
		});
		expect(result.findings.map((finding) => finding.file)).toEqual(
			typeof exclude === "string" ? [] : ["readme.txt"],
		);
		expect(result.perfStats.count).toBe(2);
		expect(result.perfStats.processed).toBe(
			typeof exclude === "string" ? 0 : 1,
		);
		expect(result.skipped.length).toBe(typeof exclude === "string" ? 2 : 1);
		if (exclude instanceof RegExp) {
			expect(exclude.lastIndex).toBe(2);
		}
	});
	it("keeps config and exclusions independent for duplicate instances and repeated matches", async () => {
		const match = /\.txt$/g;
		match.lastIndex = 2;
		const definition = {
			...fileDefinition,
			match,
			handler: async ({ config }) => [{ message: `${config?.label}` }],
		} satisfies FilePolicyDefinition<{ label: string; exclude: string[] }>;
		const policies = [
			makePolicy(definition, {
				instanceId: "one",
				config: { label: "first", exclude: ["a"] },
				exclude: ["^b"],
			}),
			makePolicy(definition, {
				instanceId: "two",
				config: { label: "second", exclude: [] },
				exclude: ["^a"],
			}),
		];
		const result = await runPolicies({
			root,
			files: ["a.txt", "b.txt", "c.txt"],
			policies,
		});
		expect(
			result.findings.map(({ file, policyId }) => [file, policyId]),
		).toEqual([
			["a.txt", "one"],
			["b.txt", "two"],
			["c.txt", "one"],
			["c.txt", "two"],
		]);
		expect(match.lastIndex).toBe(2);
		expect(result.perfStats.count).toBe(3);
	});
});

describe("concurrency, state and cancellation", () => {
	it.each([
		1,
		3,
		undefined,
	])("bounds read-only active files with concurrency %s and retains input order", async (concurrency) => {
		let active = 0;
		let maximum = 0;
		const policy = makePolicy({
			...fileDefinition,
			handler: async ({ file }) => {
				active++;
				maximum = Math.max(maximum, active);
				await new Promise((resolve) =>
					setTimeout(resolve, file === "0.txt" ? 8 : 1),
				);
				active--;
				return [{ message: file }];
			},
		});
		const files = Array.from({ length: 12 }, (_, index) => `${index}.txt`);
		const result = await runPolicies({
			root,
			policies: [policy],
			files,
			concurrency,
		});
		expect(maximum).toBe(concurrency ?? 8);
		expect(result.findings.map((finding) => finding.message)).toEqual(files);
	});
	it("runs fixes sequentially, isolates reusable concurrent runs and never mutates prior results", async () => {
		let active = 0;
		let maximum = 0;
		const runner = new PolicyRunner({
			root,
			files: ["a.txt", "b.txt"],
			fix: true,
			concurrency: 8,
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async ({ file }) => {
						active++;
						maximum = Math.max(maximum, active);
						await Promise.resolve();
						active--;
						return [{ message: file, fixStatus: "fixed" }];
					},
				}),
			],
		});
		const first = await run(() => runner.run());
		expect(maximum).toBe(1);
		const concurrent = await run(function* () {
			return yield* all([runner.run(), runner.run()]);
		});
		expect(concurrent.map((result) => result.perfStats.count)).toEqual([2, 2]);
		expect(first.perfStats.count).toBe(2);
		expect(first.findings).toHaveLength(2);
	});
	it("propagates cancellation and releases generator resources without starting queued work", async () => {
		let started = 0;
		let released = 0;
		let notify: (() => void) | undefined;
		const ready = new Promise<void>((resolve) => {
			notify = resolve;
		});
		const runner = new PolicyRunner({
			root,
			files: ["a.txt", "b.txt", "c.txt"],
			concurrency: 1,
			policies: [
				makePolicy({
					...fileDefinition,
					handler: function* () {
						started++;
						yield* ensure(() => {
							released++;
						});
						notify?.();
						yield* sleep(60000);
						return [];
					},
				}),
			],
		});
		const task = run(() => runner.run());
		await ready;
		await task.halt();
		await expect(Promise.resolve(task)).rejects.toThrow();
		expect(started).toBe(1);
		expect(released).toBe(1);
	});
	it("cancels Promise runs through AbortSignal, including generator resolvers", async () => {
		const controller = new AbortController();
		let cleanup = false;
		let notify: (() => void) | undefined;
		const ready = new Promise<void>((resolve) => {
			notify = resolve;
		});
		const result = runPolicies({
			root,
			files: ["a.txt"],
			fix: true,
			signal: controller.signal,
			policies: [
				makePolicy({
					...fileDefinition,
					handler: async () => [{ message: "fix" }],
					resolver: function* () {
						yield* ensure(() => {
							cleanup = true;
						});
						notify?.();
						yield* call(() => new Promise<void>(() => {}));
						return [];
					},
				}),
			],
		});
		await ready;
		controller.abort();
		await expect(result).rejects.toThrow();
		expect(cleanup).toBe(true);
	});

	it.each([
		0,
		-1,
		1.5,
		Number.NaN,
	])("rejects invalid concurrency %s", (concurrency) => {
		expect(
			() => new PolicyRunner({ root, files: [], policies: [], concurrency }),
		).toThrow();
	});
});

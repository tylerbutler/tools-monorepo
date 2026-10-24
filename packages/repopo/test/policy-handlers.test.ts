import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { call, type Operation } from "effection";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makePolicy } from "../src/makePolicy.js";
import type {
	FilePolicyDefinition,
	PolicyArgs,
	PolicyResult,
} from "../src/policy.js";
import { runPolicies } from "../src/runner.js";

function inMode<A>(
	mode: "promise" | "operation",
	implementation: (args: A) => Promise<PolicyResult>,
): (args: A) => Promise<PolicyResult> | Operation<PolicyResult> {
	return mode === "promise"
		? implementation
		: function* (args) {
				return yield* call(() => implementation(args));
			};
}

describe.each([
	"promise",
	"operation",
] as const)("%s handlers and resolvers", (mode) => {
	let root: string;
	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "repopo-dual-mode-"));
		await writeFile(join(root, "test.txt"), "original");
	});
	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});

	const base = {
		name: "DualMode",
		description: "Both execution styles",
		match: /\.txt$/,
	};

	it("accepts an empty result as a pass", async () => {
		const policy = {
			...base,
			handler: inMode(mode, async ({ file }: PolicyArgs) => {
				expect(file).toBe("test.txt");
				return [];
			}),
		} satisfies FilePolicyDefinition;
		const result = await runPolicies({
			root,
			files: ["test.txt"],
			policies: [makePolicy(policy)],
		});
		expect(result.findings).toEqual([]);
		expect(result.errors).toEqual([]);
	});

	it("preserves independent messages and correction guidance", async () => {
		const policy = {
			...base,
			handler: inMode(mode, async () => [
				{ message: "first", manualFix: "edit the first line" },
				{ message: "second" },
			]),
		} satisfies FilePolicyDefinition;
		const result = await runPolicies({
			root,
			files: ["test.txt"],
			policies: [makePolicy(policy)],
		});
		expect(result.findings).toMatchObject([
			{
				message: "first",
				manualFix: "edit the first line",
				file: "test.txt",
				scope: "file",
			},
			{ message: "second", file: "test.txt", scope: "file" },
		]);
		expect(result.errors).toEqual([]);
	});

	it("passes resolve and retains visible inline fixes after persisting changes", async () => {
		const policy = {
			...base,
			handler: inMode(
				mode,
				async ({ file, root: policyRoot, resolve }: PolicyArgs) => {
					if (resolve) {
						await writeFile(join(policyRoot, file), "corrected");
					}
					return [
						{
							message: "needs correction",
							fixStatus: resolve ? "fixed" : "available",
						},
					];
				},
			),
		} satisfies FilePolicyDefinition;
		const options = {
			root,
			files: ["test.txt"],
			policies: [makePolicy(policy)],
		};
		const check = await runPolicies(options);
		expect(check.findings[0]?.fixStatus).toBe("available");
		expect(await readFile(join(root, "test.txt"), "utf8")).toBe("original");
		const fix = await runPolicies({ ...options, fix: true });
		expect(fix.findings[0]?.fixStatus).toBe("fixed");
		expect(await readFile(join(root, "test.txt"), "utf8")).toBe("corrected");
		expect(fix.errors).toEqual([]);
	});

	it("passes complete required configuration to handlers", async () => {
		const policy = {
			...base,
			requiresConfig: true,
			handler: inMode(
				mode,
				async ({ config }: PolicyArgs<{ threshold: number }>) => {
					expect(config).toEqual({ threshold: 100 });
					return [];
				},
			),
		} satisfies FilePolicyDefinition<{ threshold: number }>;
		const result = await runPolicies({
			root,
			files: ["test.txt"],
			policies: [makePolicy(policy, { config: { threshold: 100 } })],
		});
		expect(result.errors).toEqual([]);
	});

	it("reports the original exception without pretending it was a finding", async () => {
		const cause = new Error("handler failed");
		const policy = {
			...base,
			handler: inMode(mode, async () => {
				throw cause;
			}),
		} satisfies FilePolicyDefinition;
		const result = await runPolicies({
			root,
			files: ["test.txt"],
			policies: [makePolicy(policy)],
		});
		expect(result.findings).toEqual([]);
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0]?.cause).toBe(cause);
	});

	it("passes findings to standalone resolvers and keeps their fixed results", async () => {
		const policy = {
			...base,
			handler: inMode(mode, async () => [
				{ message: "needs fixing", fixStatus: "available" },
			]),
			resolver: inMode(mode, async ({ findings }) =>
				findings.map((finding) => ({ ...finding, fixStatus: "fixed" })),
			),
		} satisfies FilePolicyDefinition;
		const result = await runPolicies({
			root,
			files: ["test.txt"],
			fix: true,
			policies: [makePolicy(policy)],
		});
		expect(result.findings).toMatchObject([
			{ message: "needs fixing", fixStatus: "fixed" },
		]);
		expect(result.errors).toEqual([]);
	});

	it("keeps failed resolver findings unresolved without manufacturing an execution error", async () => {
		const policy = {
			...base,
			handler: inMode(mode, async () => [{ message: "needs fixing" }]),
			resolver: inMode(mode, async ({ findings }) =>
				findings.map((finding) => ({
					...finding,
					fixStatus: "failed",
					manualFix: "correct manually",
				})),
			),
		} satisfies FilePolicyDefinition;
		const result = await runPolicies({
			root,
			files: ["test.txt"],
			fix: true,
			policies: [makePolicy(policy)],
		});
		expect(result.findings).toMatchObject([
			{
				message: "needs fixing",
				fixStatus: "failed",
				manualFix: "correct manually",
			},
		]);
		expect(result.errors).toEqual([]);
	});
});

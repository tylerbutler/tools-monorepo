import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { call, ensure, run, sleep, spawn } from "effection";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { makePolicy } from "../src/makePolicy.js";
import type { FilePolicyDefinition } from "../src/policy.js";
import { PolicyRunner } from "../src/runner.js";

describe("Effection runtime integration", () => {
	let root: string;
	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "repopo-effection-"));
	});
	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});
	const base = {
		name: "Operation",
		description: "Generator integration",
		match: /\.txt$/,
	};

	it("runs multiple generator policies across bounded concurrent files", async () => {
		const visited: string[] = [];
		const definition = {
			...base,
			handler: function* ({ file }) {
				yield* sleep(1);
				visited.push(file);
				return [];
			},
		} satisfies FilePolicyDefinition;
		const runner = new PolicyRunner({
			root,
			files: ["a.txt", "b.txt", "c.txt"],
			concurrency: 3,
			policies: [
				makePolicy(definition, { instanceId: "first" }),
				makePolicy(definition, { instanceId: "second" }),
			],
		});
		const result = await run(() => runner.run());
		expect(visited.sort()).toEqual([
			"a.txt",
			"a.txt",
			"b.txt",
			"b.txt",
			"c.txt",
			"c.txt",
		]);
		expect(result.errors).toEqual([]);
		expect(result.perfStats.processed).toBe(3);
	});

	it("retains generator findings while continuing other files", async () => {
		const definition = {
			...base,
			handler: function* ({ file }) {
				yield* sleep(1);
				return file === "bad.txt" ? [{ message: "File is bad" }] : [];
			},
		} satisfies FilePolicyDefinition;
		const result = await run(() =>
			new PolicyRunner({
				root,
				files: ["good.txt", "bad.txt"],
				policies: [makePolicy(definition)],
			}).run(),
		);
		expect(result.findings).toMatchObject([
			{ message: "File is bad", file: "bad.txt" },
		]);
		expect(result.perfStats.processed).toBe(2);
	});

	it("processes many files with bounded generator concurrency and complete statistics", async () => {
		let active = 0;
		let maximum = 0;
		const definition = {
			...base,
			handler: function* () {
				active++;
				maximum = Math.max(maximum, active);
				try {
					yield* sleep(1);
					return [];
				} finally {
					active--;
				}
			},
		} satisfies FilePolicyDefinition;
		const result = await run(() =>
			new PolicyRunner({
				root,
				files: Array.from({ length: 50 }, (_, index) => `${index}.txt`),
				concurrency: 8,
				policies: [makePolicy(definition)],
			}).run(),
		);
		expect(maximum).toBe(8);
		expect(active).toBe(0);
		expect(result.perfStats.count).toBe(50);
		expect(result.perfStats.processed).toBe(50);
	});

	it("allows generator handlers to recover internally", async () => {
		let recovered = false;
		const definition = {
			...base,
			handler: function* () {
				try {
					yield* sleep(1);
					throw new Error("recoverable");
				} catch {
					recovered = true;
					return [];
				}
			},
		} satisfies FilePolicyDefinition;
		const result = await run(() =>
			new PolicyRunner({
				root,
				files: ["a.txt"],
				policies: [makePolicy(definition)],
			}).run(),
		);
		expect(recovered).toBe(true);
		expect(result.errors).toEqual([]);
	});

	it("executes generator resolvers and persists their fixes", async () => {
		await writeFile(join(root, "broken.txt"), "broken");
		const definition = {
			...base,
			handler: async () => [
				{ message: "Needs fixing", fixStatus: "available" },
			],
			resolver: function* ({ findings, file, root: policyRoot }) {
				yield* call(() => writeFile(join(policyRoot, file), "corrected"));
				return findings.map((finding) => ({
					...finding,
					fixStatus: "fixed" as const,
				}));
			},
		} satisfies FilePolicyDefinition;
		const result = await run(() =>
			new PolicyRunner({
				root,
				files: ["broken.txt"],
				fix: true,
				policies: [makePolicy(definition)],
			}).run(),
		);
		expect(result.findings).toMatchObject([
			{ message: "Needs fixing", fixStatus: "fixed" },
		]);
		expect(await readFile(join(root, "broken.txt"), "utf8")).toBe("corrected");
		expect(result.errors).toEqual([]);
	});

	it("retains original findings when a generator resolver throws", async () => {
		const cause = new Error("Resolver failed");
		const definition = {
			...base,
			handler: async () => [
				{ message: "Needs fixing", fixStatus: "available" },
			],
			resolver: function* () {
				yield* sleep(1);
				throw cause;
			},
		} satisfies FilePolicyDefinition;
		const result = await run(() =>
			new PolicyRunner({
				root,
				files: ["a.txt"],
				fix: true,
				policies: [makePolicy(definition)],
			}).run(),
		);
		expect(result.findings).toMatchObject([
			{ message: "Needs fixing", fixStatus: "available" },
		]);
		expect(result.errors[0]).toMatchObject({
			phase: "resolve",
			scope: "file",
			file: "a.txt",
			cause,
		});
	});

	it("supports mixed Promise and generator handlers using real asynchronous reads", async () => {
		await writeFile(join(root, "a.txt"), "first");
		await writeFile(join(root, "b.txt"), "second");
		const operation = {
			...base,
			match: /a\.txt$/,
			handler: function* ({ file, root: policyRoot }) {
				const message = yield* call(() =>
					readFile(join(policyRoot, file), "utf8"),
				);
				return [{ message }];
			},
		} satisfies FilePolicyDefinition;
		const promise = {
			...base,
			name: "Promise",
			match: /b\.txt$/,
			handler: async ({ file, root: policyRoot }) => [
				{ message: await readFile(join(policyRoot, file), "utf8") },
			],
		} satisfies FilePolicyDefinition;
		const result = await run(() =>
			new PolicyRunner({
				root,
				files: ["a.txt", "b.txt"],
				policies: [makePolicy(operation), makePolicy(promise)],
			}).run(),
		);
		expect(result.findings.map((finding) => finding.message)).toEqual([
			"first",
			"second",
		]);
		expect(result.errors).toEqual([]);
	});

	it("releases owned generator resources when the parent operation exits", async () => {
		let started = 0;
		let cleaned = 0;
		const definition = {
			...base,
			handler: function* () {
				started++;
				yield* ensure(() => {
					cleaned++;
				});
				yield* sleep(60000);
				return [];
			},
		} satisfies FilePolicyDefinition;
		const runner = new PolicyRunner({
			root,
			files: ["a.txt", "b.txt"],
			concurrency: 1,
			policies: [makePolicy(definition)],
		});
		await run(function* () {
			yield* spawn(() => runner.run());
			yield* sleep(10);
		});
		expect(started).toBe(1);
		expect(cleaned).toBe(1);
	});

	it("propagates required instance configuration through generator operations", async () => {
		let received: { maxLength: number; pattern: string } | undefined;
		const definition = {
			...base,
			requiresConfig: true,
			handler: function* ({ config: policyConfig }) {
				yield* sleep(1);
				received = policyConfig;
				return [];
			},
		} satisfies FilePolicyDefinition<{ maxLength: number; pattern: string }>;
		const config = { maxLength: 200, pattern: "custom" };
		const result = await run(() =>
			new PolicyRunner({
				root,
				files: ["a.txt"],
				policies: [makePolicy(definition, { config })],
			}).run(),
		);
		expect(received).toEqual(config);
		expect(result.errors).toEqual([]);
	});
});

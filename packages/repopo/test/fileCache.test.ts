import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { all, ensure, run, sleep } from "effection";
import jsonfile from "jsonfile";
import { join } from "pathe";
import { parse, TomlDate } from "smol-toml";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makePolicy } from "../src/makePolicy.js";
import type { ConfiguredPolicy, PolicyResult } from "../src/policy.js";
import { defineCargoPolicy } from "../src/policyDefiners/defineCargoPolicy.js";
import { defineGleamPolicy } from "../src/policyDefiners/defineGleamPolicy.js";
import { definePackagePolicy } from "../src/policyDefiners/definePackagePolicy.js";
import { parseToml } from "../src/policyDefiners/tomlParser.js";
import { PolicyRunner, runPolicies } from "../src/runner.js";
import { runHandler } from "./test-helpers.js";

vi.mock("jsonfile", async (importOriginal) => {
	const actual = await importOriginal<typeof import("jsonfile")>();
	return {
		...actual,
		default: { ...actual.default, readFile: vi.fn(actual.default.readFile) },
	};
});

vi.mock("node:fs/promises", async (importOriginal) => {
	const actual = await importOriginal<typeof import("node:fs/promises")>();
	return { ...actual, readFile: vi.fn(actual.readFile) };
});

vi.mock("../src/policyDefiners/tomlParser.js", async (importOriginal) => {
	const actual =
		await importOriginal<
			typeof import("../src/policyDefiners/tomlParser.js")
		>();
	return { ...actual, parseToml: vi.fn(actual.parseToml) };
});

describe("run-scoped parsed manifests", () => {
	let root: string;

	beforeEach(async () => {
		root = await mkdtemp(join(tmpdir(), "repopo-cache-"));
		vi.clearAllMocks();
	});

	afterEach(async () => {
		await rm(root, { recursive: true, force: true });
	});
	function runner(
		policies: ConfiguredPolicy[],
		resolve = false,
		files = ["package.json"],
	) {
		return new PolicyRunner({
			policies,
			root,
			fix: resolve,
			files,
		});
	}

	it.each([
		["package.json", definePackagePolicy<Record<string, unknown>>],
		["Cargo.toml", defineCargoPolicy],
		["gleam.toml", defineGleamPolicy],
	] as const)("preserves hostile async and generator causes and continues isolated checks for %s", async (file, define) => {
		await writeFile(
			join(root, file),
			file === "package.json" ? '{"name":"original"}' : 'name = "original"',
		);
		for (const mode of ["async", "generator"] as const) {
			const trap = vi.fn(() => {
				throw new Error("must not inspect rejected cause");
			});
			const cause = new Proxy({}, { getPrototypeOf: trap, get: trap });
			const reject = async (): Promise<PolicyResult> => {
				throw cause;
			};
			const result = await run(() =>
				runner(
					[
						makePolicy(
							define({
								name: "Reject",
								description: "Rejects after mutating its manifest",
								handler:
									mode === "async"
										? async (manifest) => {
												manifest.name = "mutated";
												return reject();
											}
										: function* (manifest) {
												manifest.name = "mutated";
												yield* sleep(0);
												throw cause;
											},
							}),
						),
						makePolicy(
							define({
								name: "Independent",
								description: "Still observes its isolated manifest",
								handler: async (manifest) => [
									{ message: String(manifest.name) },
								],
							}),
						),
					],
					false,
					[file],
				).run(),
			);
			expect(result.errors).toHaveLength(1);
			expect(result.errors[0]?.cause === cause).toBe(true);
			expect(result.errors[0]?.kind).toBe("exception");
			expect(result.findings).toMatchObject([
				{ policyId: "Independent", message: "original" },
			]);
			expect(trap).not.toHaveBeenCalled();
		}
	});

	it.each([
		["package.json", definePackagePolicy<Record<string, unknown>>],
		["Cargo.toml", defineCargoPolicy],
		["gleam.toml", defineGleamPolicy],
	] as const)("retains contract classification and cancellation cleanup through %s helpers", async (file, define) => {
		await writeFile(join(root, file), file === "package.json" ? "{}" : "");
		const invalid = define({
			name: "Invalid",
			description: "Invalid synchronous implementation",
			handler: async () => [],
		});
		const metadata = { name: "Invalid", description: "Invalid implementation" };
		const synchronous = Reflect.apply(define, undefined, [
			{ ...metadata, handler: () => [] },
		]);
		const legacy = Reflect.apply(define, undefined, [
			{ ...metadata, handler: async () => true },
		]);
		for (const definition of [synchronous, legacy]) {
			const result = await runPolicies({
				root,
				files: [file],
				policies: [{ ...invalid, handler: definition.handler }],
			});
			expect(result.errors).toMatchObject([{ kind: "contract" }]);
		}
		const controller = new AbortController();
		const cleanup = vi.fn();
		const running = runPolicies({
			root,
			files: [file],
			signal: controller.signal,
			policies: [
				makePolicy(
					define({
						name: "Cancel",
						description: "Releases parsed helper resources",
						handler: function* () {
							yield* ensure(cleanup);
							controller.abort(new Error("cancel parsed handler"));
							yield* sleep(10000);
							return [];
						},
					}),
				),
			],
		});
		await expect(running).rejects.toThrow();
		expect(cleanup).toHaveBeenCalledOnce();
	});

	it("deduplicates simultaneous JSON reads and isolates nested mutations", async () => {
		await writeFile(join(root, "package.json"), '{"nested":{"value":1}}');
		const seen: number[] = [];
		const policies = [0, 1, 2].map((index) =>
			makePolicy(
				definePackagePolicy<{
					nested: {
						value: number;
					};
				}>({
					name: `JSON${index}`,
					description: "Reads a manifest snapshot",
					handler: async (json) => {
						seen.push(json.nested.value);
						json.nested.value = 99;
						await Promise.resolve();
						return [];
					},
				}),
			),
		);
		const result = await run(() => runner(policies).run());
		expect(result.findings).toEqual([]);
		expect(result.errors).toEqual([]);
		expect(seen).toEqual([1, 1, 1]);
		expect(jsonfile.readFile).toHaveBeenCalledTimes(1);
	});

	it.each([
		["Cargo.toml", defineCargoPolicy],
		["gleam.toml", defineGleamPolicy],
	] as const)("deduplicates %s reads and parsing without sharing objects", async (file, define) => {
		await writeFile(
			join(root, file),
			'name = "original"\nreleased = 2024-01-01T00:00:00Z\n[nested]\nvalue = 1\n',
		);
		const seen: unknown[] = [];
		const policies = [0, 1].map((index) =>
			makePolicy(
				define({
					name: `TOML${index}`,
					description: "Reads TOML",
					handler: async (toml) => {
						seen.push(structuredClone(toml));
						toml.nested = { value: 99 };
						return [];
					},
				}),
			),
		);
		const result = await run(() => runner(policies, false, [file]).run());
		expect(result.findings).toEqual([]);
		expect(result.errors).toEqual([]);
		expect(seen).toHaveLength(2);
		expect(seen[0]).toEqual(seen[1]);
		expect(seen[1]).toMatchObject({ name: "original", nested: { value: 1 } });
		expect(readFile).toHaveBeenCalledTimes(1);
		expect(parseToml).toHaveBeenCalledTimes(1);
	});

	it("starts fresh on repeated and concurrent runs of the same runner", async () => {
		const file = join(root, "package.json");
		await writeFile(file, '{"name":"first"}');
		const names: string[] = [];
		const definition = definePackagePolicy<{
			name: string;
		}>({
			name: "Names",
			description: "Observes file changes",
			handler: async (json) => {
				names.push(json.name);
				return [];
			},
		});
		const subject = runner([
			makePolicy(definition, {
				instanceId: "first",
			}),
			makePolicy(definition, {
				instanceId: "second",
			}),
		]);
		await run(() => subject.run());
		await writeFile(file, '{"name":"second"}');
		await run(function* () {
			yield* all([subject.run(), subject.run()]);
		});
		expect(names).toEqual([
			"first",
			"first",
			"second",
			"second",
			"second",
			"second",
		]);
		expect(jsonfile.readFile).toHaveBeenCalledTimes(3);
	});

	it("bypasses reuse for fixes so later handlers observe writes", async () => {
		await writeFile(join(root, "package.json"), '{"name":"before"}');
		const definition = definePackagePolicy<
			{
				name: string;
			},
			{
				write: boolean;
			}
		>({
			name: "Fix",
			description: "Reads and writes manifests",
			handler: async (json, { config, root: gitRoot }) => {
				if (config?.write) {
					await writeFile(join(gitRoot, "package.json"), '{"name":"after"}');
					return [];
				}
				return json.name === "after" ? [] : [{ message: "Stale data" }];
			},
		});
		const result = await run(() =>
			runner(
				[
					makePolicy(definition, {
						config: { write: true },
						instanceId: "write",
					}),
					makePolicy(definition, {
						config: { write: false },
						instanceId: "read",
					}),
				],
				true,
			).run(),
		);
		expect(result.findings).toEqual([]);
		expect(result.errors).toEqual([]);
		expect(jsonfile.readFile).toHaveBeenCalledTimes(2);
	});

	it("does not cache direct helper calls and recovers from a failed run", async () => {
		const definition = definePackagePolicy({
			name: "Read",
			description: "Reads JSON",
			handler: async () => [],
		});
		const subject = runner([
			makePolicy(definition, {
				instanceId: "first",
			}),
			makePolicy(definition, {
				instanceId: "second",
			}),
		]);
		await writeFile(join(root, "package.json"), "{invalid");
		const invalid = await run(() => subject.run());
		expect(invalid.errors).toHaveLength(2);
		expect(jsonfile.readFile).toHaveBeenCalledTimes(1);
		await writeFile(join(root, "package.json"), "{}");
		expect((await run(() => subject.run())).errors).toEqual([]);
		for (let index = 0; index < 2; index++) {
			expect(
				await runHandler(definition.handler, {
					root,
					file: "package.json",
					resolve: false,
				}),
			).toEqual([]);
		}
		expect(jsonfile.readFile).toHaveBeenCalledTimes(4);
	});

	it.each([
		["Cargo.toml", defineCargoPolicy],
		["gleam.toml", defineGleamPolicy],
	] as const)("preserves TOML date kinds, methods, offsets, and mutation isolation in %s", async (file, define) => {
		const source = [
			"date = 2024-01-01",
			"time = 12:34:56",
			"local = 2024-01-01T12:34:56",
			"offset = 2024-01-01T12:34:56+02:00",
			"nested = { dates = [2024-01-01] }",
		].join("\n");
		await writeFile(join(root, file), source);
		function describeDates(toml: Record<string, unknown>) {
			return Object.values(toml)
				.filter((value): value is TomlDate => value instanceof TomlDate)
				.map((date) => ({
					iso: date.toISOString(),
					date: date.isDate(),
					time: date.isTime(),
					local: date.isLocal(),
					dateTime: date.isDateTime(),
				}));
		}
		const expected = describeDates(parse(source));
		const seen: unknown[] = [];
		const policies = [0, 1].map((index) =>
			makePolicy(
				define({
					name: `Dates${index}`,
					description: "Observes TOML dates",
					handler: async (toml) => {
						seen.push(describeDates(toml));
						expect(toml.nested).toEqual({
							dates: [new TomlDate("2024-01-01")],
						});
						if (toml.date instanceof TomlDate) {
							toml.date.setFullYear(2000);
						}
						return [];
					},
				}),
			),
		);
		const result = await run(() => runner(policies, false, [file]).run());
		expect(result.findings).toEqual([]);
		expect(result.errors).toEqual([]);
		expect(seen).toEqual([expected, expected]);
		expect(expected).toHaveLength(4);
		expect(readFile).toHaveBeenCalledTimes(1);
		expect(parseToml).toHaveBeenCalledTimes(1);
	});
});

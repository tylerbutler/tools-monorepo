import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type FluidHandler,
	fromFluidHandlers,
} from "../../src/adapters/fluidFramework.js";
import { makePolicy } from "../../src/makePolicy.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runPolicies } from "../../src/runner.js";
import { runHandler } from "../test-helpers.js";

describe("FluidFramework adapter", () => {
	it.each([
		"handler",
		"resolver",
	] as const)("preserves hostile rejected values at the external %s boundary", async (phase) => {
		const trap = vi.fn(() => {
			throw new Error("must not inspect");
		});
		const cause = new Proxy({}, { getPrototypeOf: trap, get: trap });
		const definitions = fromFluidHandlers([
			{
				name: "External",
				match: /./,
				handler: async () => {
					if (phase === "handler") {
						throw cause;
					}
					return "needs fix";
				},
				resolver: async () => {
					throw cause;
				},
			},
		]);
		const result = await runPolicies({
			root: ".",
			files: ["a.txt", "b.txt"],
			fix: phase === "resolver",
			policies: definitions.map((definition) => makePolicy(definition)),
		});
		expect(result.errors).toHaveLength(2);
		expect(result.errors.every((error) => error.cause === cause)).toBe(true);
		expect(result.errors.every((error) => error.kind === "exception")).toBe(
			true,
		);
		expect(trap).not.toHaveBeenCalled();
	});

	let tempDir: string;

	beforeEach(async () => {
		tempDir = join(
			tmpdir(),
			`repopo-fluid-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		await mkdir(tempDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	const createTestFile = async (
		filename: string,
		content: string,
	): Promise<string> => {
		const filePath = join(tempDir, filename);
		await writeFile(filePath, content);
		return filename; // return relative path
	};
	const createArgs = (file: string): PolicyArgs<undefined> => ({
		file,
		root: tempDir,
		resolve: false,
		config: undefined,
	});

	describe("single handler conversion", () => {
		it("should convert a passing Fluid handler", async () => {
			const fluidHandler: FluidHandler = {
				name: "test-handler",
				match: /\.ts$/,
				handler: async () => undefined, // passes
			};

			const policy = fromFluidHandlers([fluidHandler])[0];

			expect(policy.name).toBe("test-handler");
			expect(policy.match).toEqual(/\.ts$/);

			const file = await createTestFile("test.ts", "const x = 1;");
			const result = await runHandler(policy.handler, createArgs(file));
			expect(result).toEqual([]);
		});

		it("should convert a failing Fluid handler", async () => {
			const fluidHandler: FluidHandler = {
				name: "no-console",
				match: /\.ts$/,
				handler: async () => "console.log is not allowed",
			};

			const policy = fromFluidHandlers([fluidHandler])[0];
			const file = await createTestFile("test.ts", "console.log('hi');");
			const result = await runHandler(policy.handler, createArgs(file));
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.every((finding) => !("name" in finding))).toBe(true);
				expect(result.every((finding) => !("file" in finding))).toBe(true);
				expect(result.map((finding) => finding.message).join()).toBe(
					"console.log is not allowed",
				);
				expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
					false,
				);
			}
		});

		it("should mark policy as auto-fixable when resolver exists", async () => {
			const fluidHandler: FluidHandler = {
				name: "fixable-handler",
				match: /\.ts$/,
				handler: async () => "error",
				resolver: async () => ({ resolved: true }),
			};

			const policy = fromFluidHandlers([fluidHandler])[0];
			const file = await createTestFile("test.ts", "content");
			const result = await runHandler(policy.handler, createArgs(file));
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
					true,
				);
			}
		});

		it("should apply name prefix when provided", async () => {
			const fluidHandler: FluidHandler = {
				name: "my-handler",
				match: /\.ts$/,
				handler: async () => undefined,
			};

			const [policy] = fromFluidHandlers([fluidHandler], {
				namePrefix: "Fluid:",
			});

			expect(policy.name).toBe("Fluid:my-handler");
		});

		it("should pass absolute path to Fluid handler", async () => {
			const receivedPath = vi.fn();
			const fluidHandler: FluidHandler = {
				name: "path-checker",
				match: /\.ts$/,
				handler: async (handlerFile) => {
					receivedPath(handlerFile);
					return undefined;
				},
			};

			const policy = fromFluidHandlers([fluidHandler])[0];
			const file = await createTestFile("test.ts", "content");
			await runHandler(policy.handler, createArgs(file));

			// Fluid handler should receive absolute path
			expect(receivedPath).toHaveBeenCalledWith(join(tempDir, file));
		});

		describe("resolver support", () => {
			it("should call resolver when resolve=true and handler fails", async () => {
				const resolverCalled = vi.fn();
				const fluidHandler: FluidHandler = {
					name: "fixable",
					match: /\.ts$/,
					handler: async () => "needs fix",
					resolver: async (resolverFile, root) => {
						resolverCalled(resolverFile, root);
						return { resolved: true, message: "Fixed!" };
					},
				};

				const policy = fromFluidHandlers([fluidHandler])[0];
				const file = await createTestFile("test.ts", "content");
				const result = await runHandler(policy.handler, {
					...createArgs(file),
					resolve: true,
				});

				expect(resolverCalled).toHaveBeenCalledWith(
					join(tempDir, file),
					tempDir,
				);
				expect(result).not.toEqual([]);
				if (typeof result === "object" && result.length > 0) {
					expect(
						result.length > 0 &&
							result.every((finding) => finding.fixStatus === "fixed"),
					).toBe(true);
					expect(result.map((finding) => finding.message).join()).toBe(
						"Fixed!",
					);
				}
			});

			it("should not call resolver when resolve=false", async () => {
				const resolverCalled = vi.fn();
				const fluidHandler: FluidHandler = {
					name: "fixable",
					match: /\.ts$/,
					handler: async () => "needs fix",
					resolver: async () => {
						resolverCalled();
						return { resolved: true };
					},
				};

				const policy = fromFluidHandlers([fluidHandler])[0];
				const file = await createTestFile("test.ts", "content");
				await runHandler(policy.handler, createArgs(file));

				expect(resolverCalled).not.toHaveBeenCalled();
			});
			it("translates the external resolver inline without a redundant standalone resolver", async () => {
				const fluidHandler: FluidHandler = {
					name: "fixable",
					match: /\.ts$/,
					handler: async () => "original error",
					resolver: async () => ({ resolved: true, message: "standalone fix" }),
				};

				const policy = fromFluidHandlers([fluidHandler])[0];
				expect(policy.resolver).toBeUndefined();
				const file = await createTestFile("test.ts", "content");
				const result = await runHandler(policy.handler, {
					file,
					root: tempDir,
					resolve: true,
					config: undefined,
				});
				expect(
					result.length > 0 &&
						result.every((finding) => finding.fixStatus === "fixed"),
				).toBe(true);
				expect(result.map((finding) => finding.message).join()).toBe(
					"standalone fix",
				);
			});

			it("should handle resolver returning unresolved", async () => {
				const fluidHandler: FluidHandler = {
					name: "unfixable",
					match: /\.ts$/,
					handler: async () => "error",
					resolver: async () => ({
						resolved: false,
						message: "Could not fix",
					}),
				};

				const policy = fromFluidHandlers([fluidHandler])[0];
				const file = await createTestFile("test.ts", "content");
				const result = await runHandler(policy.handler, {
					...createArgs(file),
					resolve: true,
				});
				if (typeof result === "object" && result.length > 0) {
					expect(
						result.length > 0 &&
							result.every((finding) => finding.fixStatus === "fixed"),
					).toBe(false);
					expect(result.map((finding) => finding.message).join()).toBe(
						"Could not fix",
					);
				}
			});

			it("should support sync resolver", async () => {
				const fluidHandler: FluidHandler = {
					name: "sync-fixable",
					match: /\.ts$/,
					handler: async () => "error",
					resolver: () => ({ resolved: true }), // sync, not async
				};

				const policy = fromFluidHandlers([fluidHandler])[0];
				const file = await createTestFile("test.ts", "content");
				const result = await runHandler(policy.handler, {
					...createArgs(file),
					resolve: true,
				});
				if (typeof result === "object" && result.length > 0) {
					expect(
						result.length > 0 &&
							result.every((finding) => finding.fixStatus === "fixed"),
					).toBe(true);
				}
			});
		});
	});

	describe("fromFluidHandlers", () => {
		it("should convert an array of Fluid handlers", async () => {
			const handlers: FluidHandler[] = [
				{
					name: "handler-1",
					match: /\.ts$/,
					handler: async () => undefined,
				},
				{
					name: "handler-2",
					match: /\.js$/,
					handler: async () => undefined,
				},
			];

			const policies = fromFluidHandlers(handlers);

			expect(policies).toHaveLength(2);
			expect(policies[0].name).toBe("handler-1");
			expect(policies[1].name).toBe("handler-2");
		});

		it("should apply name prefix to all handlers", async () => {
			const handlers: FluidHandler[] = [
				{
					name: "handler-1",
					match: /\.ts$/,
					handler: async () => undefined,
				},
				{
					name: "handler-2",
					match: /\.js$/,
					handler: async () => undefined,
				},
			];

			const policies = fromFluidHandlers(handlers, { namePrefix: "FF:" });

			expect(policies[0].name).toBe("FF:handler-1");
			expect(policies[1].name).toBe("FF:handler-2");
		});

		it("should handle empty array", () => {
			const policies = fromFluidHandlers([]);
			expect(policies).toHaveLength(0);
		});
	});
});

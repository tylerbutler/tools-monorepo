import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type FluidHandler,
	fromFluidHandler,
	fromFluidHandlers,
} from "../../src/adapters/fluidFramework.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("FluidFramework adapter", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-fluid-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const createTestFile = (filename: string, content: string): string => {
		const filePath = join(tempDir, filename);
		writeFileSync(filePath, content);
		return filename; // return relative path
	};

	const createArgs = (file: string): PolicyFunctionArguments<undefined> => ({
		file,
		root: tempDir,
		resolve: false,
		config: undefined,
	});

	describe("fromFluidHandler", () => {
		it("should convert a passing Fluid handler", async () => {
			const fluidHandler: FluidHandler = {
				name: "test-handler",
				match: /\.ts$/,
				handler: async () => undefined, // passes
			};

			const policy = fromFluidHandler(fluidHandler);

			expect(policy.name).toBe("test-handler");
			expect(policy.match).toEqual(/\.ts$/);

			const file = createTestFile("test.ts", "const x = 1;");
			const result = await policy.handler(createArgs(file));

			expect(result).toBe(true);
		});

		it("should convert a failing Fluid handler", async () => {
			const fluidHandler: FluidHandler = {
				name: "no-console",
				match: /\.ts$/,
				handler: async () => "console.log is not allowed",
			};

			const policy = fromFluidHandler(fluidHandler);
			const file = createTestFile("test.ts", "console.log('hi');");
			const result = await policy.handler(createArgs(file));

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.name).toBe("no-console");
				expect(result.file).toBe(file);
				expect(result.errorMessage).toBe("console.log is not allowed");
				expect(result.autoFixable).toBe(false);
			}
		});

		it("should mark policy as auto-fixable when resolver exists", async () => {
			const fluidHandler: FluidHandler = {
				name: "fixable-handler",
				match: /\.ts$/,
				handler: async () => "error",
				resolver: async () => ({ resolved: true }),
			};

			const policy = fromFluidHandler(fluidHandler);
			const file = createTestFile("test.ts", "content");
			const result = await policy.handler(createArgs(file));

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(true);
			}
		});

		it("should apply name prefix when provided", async () => {
			const fluidHandler: FluidHandler = {
				name: "my-handler",
				match: /\.ts$/,
				handler: async () => undefined,
			};

			const policy = fromFluidHandler(fluidHandler, {
				namePrefix: "Fluid:",
			});

			expect(policy.name).toBe("Fluid:my-handler");
		});

		it("should pass absolute path to Fluid handler", async () => {
			const receivedPath = vi.fn();
			const fluidHandler: FluidHandler = {
				name: "path-checker",
				match: /\.ts$/,
				handler: async (file) => {
					receivedPath(file);
					return undefined;
				},
			};

			const policy = fromFluidHandler(fluidHandler);
			const file = createTestFile("test.ts", "content");
			await policy.handler(createArgs(file));

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
					resolver: async (file, root) => {
						resolverCalled(file, root);
						return { resolved: true, message: "Fixed!" };
					},
				};

				const policy = fromFluidHandler(fluidHandler);
				const file = createTestFile("test.ts", "content");
				const result = await policy.handler({
					...createArgs(file),
					resolve: true,
				});

				expect(resolverCalled).toHaveBeenCalledWith(join(tempDir, file), tempDir);
				expect(result).not.toBe(true);
				if (typeof result === "object" && "resolved" in result) {
					expect(result.resolved).toBe(true);
					expect(result.errorMessage).toBe("Fixed!");
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

				const policy = fromFluidHandler(fluidHandler);
				const file = createTestFile("test.ts", "content");
				await policy.handler(createArgs(file));

				expect(resolverCalled).not.toHaveBeenCalled();
			});

			it("should create standalone resolver when Fluid handler has one", async () => {
				const fluidHandler: FluidHandler = {
					name: "fixable",
					match: /\.ts$/,
					handler: async () => "original error",
					resolver: async () => ({ resolved: true, message: "standalone fix" }),
				};

				const policy = fromFluidHandler(fluidHandler);

				expect(policy.resolver).toBeDefined();

				const file = createTestFile("test.ts", "content");
				// biome-ignore lint/style/noNonNullAssertion: we just checked it's defined
				const result = await policy.resolver!({
					file,
					root: tempDir,
					config: undefined,
				});

				expect(result.resolved).toBe(true);
				expect(result.errorMessage).toBe("standalone fix");
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

				const policy = fromFluidHandler(fluidHandler);
				const file = createTestFile("test.ts", "content");
				const result = await policy.handler({
					...createArgs(file),
					resolve: true,
				});

				if (typeof result === "object" && "resolved" in result) {
					expect(result.resolved).toBe(false);
					expect(result.errorMessage).toBe("Could not fix");
				}
			});

			it("should support sync resolver", async () => {
				const fluidHandler: FluidHandler = {
					name: "sync-fixable",
					match: /\.ts$/,
					handler: async () => "error",
					resolver: () => ({ resolved: true }), // sync, not async
				};

				const policy = fromFluidHandler(fluidHandler);
				const file = createTestFile("test.ts", "content");
				const result = await policy.handler({
					...createArgs(file),
					resolve: true,
				});

				if (typeof result === "object" && "resolved" in result) {
					expect(result.resolved).toBe(true);
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

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { TaskHandlerRegistry } from "../../../../src/core/tasks/TaskHandlerRegistry.js";
import { LeafTask } from "../../../../src/core/tasks/leaf/leafTask.js";
import type {
	TaskHandler,
	TaskHandlerConstructor,
} from "../../../../src/core/tasks/taskHandlers.js";

describe("TaskHandlerRegistry", () => {
	let registry: TaskHandlerRegistry;

	beforeEach(() => {
		registry = new TaskHandlerRegistry();
	});

	describe("register", () => {
		it("should register a task handler", () => {
			const handler = class TestHandler extends LeafTask {} as TaskHandlerConstructor;
			registry.register("test", handler);

			expect(registry.has("test")).toBe(true);
			expect(registry.get("test")).toBe(handler);
		});

		it("should register handlers case-insensitively", () => {
			const handler = class TestHandler extends LeafTask {} as TaskHandlerConstructor;
			registry.register("TEST", handler);

			expect(registry.has("test")).toBe(true);
			expect(registry.has("Test")).toBe(true);
			expect(registry.has("TEST")).toBe(true);
		});

		it("should allow overriding handlers", () => {
			const handler1 = class Handler1 extends LeafTask {} as TaskHandlerConstructor;
			const handler2 = class Handler2 extends LeafTask {} as TaskHandlerConstructor;

			registry.register("test", handler1);
			registry.register("test", handler2);

			expect(registry.get("test")).toBe(handler2);
		});
	});

	describe("get and has", () => {
		it("should return undefined for unregistered handlers", () => {
			expect(registry.get("nonexistent")).toBeUndefined();
			expect(registry.has("nonexistent")).toBe(false);
		});

		it("should return the registered handler", () => {
			const handler = class TestHandler extends LeafTask {} as TaskHandlerConstructor;
			registry.register("test", handler);

			expect(registry.get("test")).toBe(handler);
		});
	});

	describe("getRegisteredExecutables", () => {
		it("should return empty array when no handlers registered", () => {
			expect(registry.getRegisteredExecutables()).toEqual([]);
		});

		it("should return all registered executable names", () => {
			const handler1 = class Handler1 extends LeafTask {} as TaskHandlerConstructor;
			const handler2 = class Handler2 extends LeafTask {} as TaskHandlerConstructor;

			registry.register("test1", handler1);
			registry.register("test2", handler2);

			const executables = registry.getRegisteredExecutables();
			expect(executables).toHaveLength(2);
			expect(executables).toContain("test1");
			expect(executables).toContain("test2");
		});
	});

	describe("clear", () => {
		it("should remove all registered handlers", () => {
			const handler = class TestHandler extends LeafTask {} as TaskHandlerConstructor;
			registry.register("test1", handler);
			registry.register("test2", handler);

			expect(registry.getRegisteredExecutables()).toHaveLength(2);

			registry.clear();

			expect(registry.getRegisteredExecutables()).toHaveLength(0);
			expect(registry.has("test1")).toBe(false);
			expect(registry.has("test2")).toBe(false);
		});
	});

	describe("loadHandler", () => {
		const testDir = join(__dirname, "..", "..", "..", "temp-test-handlers");

		beforeEach(() => {
			if (!existsSync(testDir)) {
				mkdirSync(testDir, { recursive: true });
			}
		});

		afterEach(() => {
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true, force: true });
			}
		});

		it("should load a handler from a module with default export", async () => {
			const handlerPath = join(testDir, "testHandler.mjs");
			writeFileSync(
				handlerPath,
				`
export default class TestHandler {
	constructor(node, command, context, taskName) {
		this.node = node;
		this.command = command;
	}
}
			`,
			);

			await registry.loadHandler("test", {
				modulePath: handlerPath,
			});

			expect(registry.has("test")).toBe(true);
		});

		it("should load a handler from a module with named export", async () => {
			const handlerPath = join(testDir, "namedHandler.mjs");
			writeFileSync(
				handlerPath,
				`
export class NamedHandler {
	constructor(node, command, context, taskName) {
		this.node = node;
		this.command = command;
	}
}
			`,
			);

			await registry.loadHandler(
				"test",
				{
					modulePath: handlerPath,
					exportName: "NamedHandler",
				},
				testDir,
			);

			expect(registry.has("test")).toBe(true);
		});

		it("should throw error for non-existent module", async () => {
			await expect(
				registry.loadHandler("test", {
					modulePath: "./nonexistent.js",
				}),
			).rejects.toThrow();
		});

		it("should throw error for non-existent export name", async () => {
			const handlerPath = join(testDir, "wrongExport.mjs");
			writeFileSync(
				handlerPath,
				`
export class SomeHandler {}
			`,
			);

			await expect(
				registry.loadHandler("test", {
					modulePath: handlerPath,
					exportName: "NonExistent",
				}),
			).rejects.toThrow(/does not export/);
		});

		it("should throw error for non-function handler", async () => {
			const handlerPath = join(testDir, "invalidHandler.mjs");
			writeFileSync(
				handlerPath,
				`
export default { notAFunction: true };
			`,
			);

			await expect(
				registry.loadHandler("test", {
					modulePath: handlerPath,
				}),
			).rejects.toThrow(/must be a function/);
		});
	});

	describe("loadHandlers", () => {
		const testDir = join(__dirname, "..", "..", "..", "temp-test-handlers-multi");

		beforeEach(() => {
			if (!existsSync(testDir)) {
				mkdirSync(testDir, { recursive: true });
			}
		});

		afterEach(() => {
			if (existsSync(testDir)) {
				rmSync(testDir, { recursive: true, force: true });
			}
		});

		it("should load multiple handlers successfully", async () => {
			const handler1Path = join(testDir, "handler1.mjs");
			const handler2Path = join(testDir, "handler2.mjs");

			writeFileSync(
				handler1Path,
				`
export default class Handler1 {}
			`,
			);
			writeFileSync(
				handler2Path,
				`
export default class Handler2 {}
			`,
			);

			const errors = await registry.loadHandlers(
				{
					test1: { modulePath: handler1Path },
					test2: { modulePath: handler2Path },
				},
				testDir,
			);

			expect(errors).toHaveLength(0);
			expect(registry.has("test1")).toBe(true);
			expect(registry.has("test2")).toBe(true);
		});

		it("should collect errors but continue loading other handlers", async () => {
			const validPath = join(testDir, "valid.mjs");
			writeFileSync(
				validPath,
				`
export default class ValidHandler {}
			`,
			);

			const errors = await registry.loadHandlers(
				{
					valid: { modulePath: validPath },
					invalid: { modulePath: "./nonexistent.js" },
				},
				testDir,
			);

			expect(errors).toHaveLength(1);
			expect(errors[0]).toBeInstanceOf(Error);
			expect(registry.has("valid")).toBe(true);
			expect(registry.has("invalid")).toBe(false);
		});
	});
});

import type { Config } from "@oclif/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand } from "../../src/baseCommand.js";
import { createLazy } from "../../src/capabilities/capability.js";

// Test command class
class TestCommand extends BaseCommand<typeof TestCommand> {
	public static override readonly description = "Test command";
	public errorSpy = vi.fn();

	public override error(
		message: string | Error,
		options?: { exit: number },
	): never {
		this.errorSpy(message, options);
		throw new Error(message.toString());
	}
}

interface MockResult {
	data: string;
	helperMethod(): string;
}

describe("createLazy", () => {
	let command: TestCommand;
	let mockConfig: Config;

	beforeEach(() => {
		mockConfig = {
			root: "/test/root",
			bin: "test-cli",
			version: "1.0.0",
			// biome-ignore lint/suspicious/noExplicitAny: Test config mock requires partial Config object
			pjson: {} as any,
		} as Config;

		command = new TestCommand([], mockConfig);
	});

	describe("initialization", () => {
		it("should initialize on first get() call", async () => {
			let initCalled = false;
			const lazy = createLazy<MockResult>(async () => {
				initCalled = true;
				return { data: "mock-data", helperMethod: () => "helper-result" };
			}, command);

			expect(lazy.isInitialized).toBe(false);
			expect(initCalled).toBe(false);

			const result = await lazy.get();

			expect(lazy.isInitialized).toBe(true);
			expect(initCalled).toBe(true);
			expect(result.data).toBe("mock-data");
			expect(result.helperMethod()).toBe("helper-result");
		});

		it("should cache result after initialization", async () => {
			let initCount = 0;
			const lazy = createLazy<MockResult>(async () => {
				initCount++;
				return { data: "mock-data", helperMethod: () => "helper-result" };
			}, command);

			const result1 = await lazy.get();
			const result2 = await lazy.get();

			// Should be the same object
			expect(result1).toBe(result2);
			// Initialize should only be called once
			expect(initCount).toBe(1);
		});

		it("should cache undefined results after initialization", async () => {
			let initCount = 0;
			const lazy = createLazy<undefined>(async () => {
				initCount++;
				return undefined;
			}, command);

			const result1 = await lazy.get();
			const result2 = await lazy.get();

			expect(result1).toBeUndefined();
			expect(result2).toBeUndefined();
			expect(lazy.isInitialized).toBe(true);
			expect(initCount).toBe(1);
		});

		it("should not initialize until get() is called", async () => {
			let initCalled = false;
			createLazy<MockResult>(async () => {
				initCalled = true;
				return { data: "test", helperMethod: () => "test" };
			}, command);

			expect(initCalled).toBe(false);
		});
	});

	describe("error handling", () => {
		it("should call command.error() on initialization failure", async () => {
			const lazy = createLazy<MockResult>(async () => {
				throw new Error("Initialization failed");
			}, command);

			await expect(lazy.get()).rejects.toThrow("Initialization failed");
			expect(command.errorSpy).toHaveBeenCalledWith(
				"Failed to initialize capability: Initialization failed",
				{ exit: 1 },
			);
		});

		it("should handle non-Error thrown objects", async () => {
			const lazy = createLazy<MockResult>(async () => {
				throw new Error("String error");
			}, command);

			await expect(lazy.get()).rejects.toThrow();
			expect(command.errorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to initialize capability"),
				{ exit: 1 },
			);
		});
	});

	describe("concurrent access", () => {
		it("should handle concurrent get() calls correctly", async () => {
			let initCount = 0;
			const lazy = createLazy<MockResult>(async () => {
				initCount++;
				return { data: "mock-data", helperMethod: () => "helper-result" };
			}, command);

			// Call get() multiple times concurrently
			const results = await Promise.all([lazy.get(), lazy.get(), lazy.get()]);

			// All should return the same object
			expect(results[0]).toBe(results[1]);
			expect(results[1]).toBe(results[2]);

			// Initialize should only be called once
			expect(initCount).toBe(1);
		});
	});
});

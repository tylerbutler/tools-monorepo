import type { Config } from "@oclif/core";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand } from "../../src/baseCommand.js";
import {
	type Capability,
	CapabilityHolder,
} from "../../src/capabilities/capability.js";

// Mock capability for testing
interface MockResult {
	data: string;
	helperMethod(): string;
}

class MockCapability implements Capability<BaseCommand<any>, MockResult> {
	public initializeCalled = false;
	public cleanupCalled = false;

	public async initialize(command: BaseCommand<any>): Promise<MockResult> {
		this.initializeCalled = true;
		return {
			data: "mock-data",
			helperMethod: () => "helper-result",
		};
	}

	public async cleanup(): Promise<void> {
		this.cleanupCalled = true;
	}
}

class ErrorCapability implements Capability<BaseCommand<any>, MockResult> {
	public async initialize(command: BaseCommand<any>): Promise<MockResult> {
		throw new Error("Initialization failed");
	}
}

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

describe("CapabilityHolder", () => {
	let command: TestCommand;
	let mockConfig: Config;

	beforeEach(() => {
		mockConfig = {
			root: "/test/root",
			bin: "test-cli",
			version: "1.0.0",
			pjson: {} as any,
		} as Config;

		command = new TestCommand([], mockConfig);
	});

	describe("initialization", () => {
		it("should initialize capability on first get() call", async () => {
			const mockCapability = new MockCapability();
			const holder = new CapabilityHolder(command, mockCapability);

			expect(holder.isInitialized).toBe(false);
			expect(mockCapability.initializeCalled).toBe(false);

			const result = await holder.get();

			expect(holder.isInitialized).toBe(true);
			expect(mockCapability.initializeCalled).toBe(true);
			expect(result.data).toBe("mock-data");
			expect(result.helperMethod()).toBe("helper-result");
		});

		it("should cache result after initialization", async () => {
			const mockCapability = new MockCapability();
			const holder = new CapabilityHolder(command, mockCapability);

			const result1 = await holder.get();
			const result2 = await holder.get();

			// Should be the same object
			expect(result1).toBe(result2);
			// Initialize should only be called once
			expect(mockCapability.initializeCalled).toBe(true);
		});

		it("should not initialize until get() is called", async () => {
			const mockCapability = new MockCapability();
			new CapabilityHolder(command, mockCapability);

			// Just creating the holder shouldn't initialize
			expect(mockCapability.initializeCalled).toBe(false);
		});
	});

	describe("error handling", () => {
		it("should call command.error() on initialization failure", async () => {
			const errorCapability = new ErrorCapability();
			const holder = new CapabilityHolder(command, errorCapability);

			await expect(holder.get()).rejects.toThrow("Initialization failed");
			expect(command.errorSpy).toHaveBeenCalledWith(
				"Failed to initialize capability: Initialization failed",
				{ exit: 1 },
			);
		});

		it("should handle non-Error thrown objects", async () => {
			class StringThrowCapability
				implements Capability<BaseCommand<any>, MockResult>
			{
				public async initialize(
					command: BaseCommand<any>,
				): Promise<MockResult> {
					throw "String error";
				}
			}

			const holder = new CapabilityHolder(command, new StringThrowCapability());

			await expect(holder.get()).rejects.toThrow();
			expect(command.errorSpy).toHaveBeenCalledWith(
				expect.stringContaining("Failed to initialize capability"),
				{ exit: 1 },
			);
		});
	});

	describe("cleanup", () => {
		it("should call capability cleanup() method", async () => {
			const mockCapability = new MockCapability();
			const holder = new CapabilityHolder(command, mockCapability);

			await holder.get();
			await holder.cleanup();

			expect(mockCapability.cleanupCalled).toBe(true);
		});

		it("should not fail if capability has no cleanup method", async () => {
			class NoCleanupCapability
				implements Capability<BaseCommand<any>, MockResult>
			{
				public async initialize(
					command: BaseCommand<any>,
				): Promise<MockResult> {
					return {
						data: "test",
						helperMethod: () => "test",
					};
				}
			}

			const holder = new CapabilityHolder(command, new NoCleanupCapability());
			await holder.get();

			// Should not throw
			await expect(holder.cleanup()).resolves.toBeUndefined();
		});

		it("should not fail if cleanup called before initialization", async () => {
			const mockCapability = new MockCapability();
			const holder = new CapabilityHolder(command, mockCapability);

			// Should not throw
			await expect(holder.cleanup()).resolves.toBeUndefined();
			expect(mockCapability.cleanupCalled).toBe(false);
		});
	});

	describe("concurrent access", () => {
		it("should handle concurrent get() calls correctly", async () => {
			const mockCapability = new MockCapability();
			const holder = new CapabilityHolder(command, mockCapability);

			// Call get() multiple times concurrently
			const results = await Promise.all([
				holder.get(),
				holder.get(),
				holder.get(),
			]);

			// All should return the same object
			expect(results[0]).toBe(results[1]);
			expect(results[1]).toBe(results[2]);

			// Initialize should only be called once
			expect(mockCapability.initializeCalled).toBe(true);
		});
	});
});

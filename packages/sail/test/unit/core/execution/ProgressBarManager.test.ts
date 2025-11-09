import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ProgressBarManager } from "../../../../src/core/execution/ProgressBarManager.js";

// Mock log-update module
vi.mock("log-update", () => {
	const mockLogUpdate = vi.fn();
	mockLogUpdate.clear = vi.fn();
	mockLogUpdate.done = vi.fn();
	return { default: mockLogUpdate };
});

import logUpdate from "log-update";

describe("ProgressBarManager", () => {
	let progressBar: ProgressBarManager;
	let originalConsoleLog: typeof console.log;
	let originalConsoleError: typeof console.error;

	beforeEach(() => {
		// Save original console methods
		originalConsoleLog = console.log;
		originalConsoleError = console.error;

		// Create fresh instance
		progressBar = new ProgressBarManager();

		// Clear all mocks
		vi.clearAllMocks();
	});

	afterEach(() => {
		// Ensure console is restored after each test
		console.log = originalConsoleLog;
		console.error = originalConsoleError;
	});

	describe("start()", () => {
		it("should patch console.log and console.error", () => {
			progressBar.start();

			expect(console.log).not.toBe(originalConsoleLog);
			expect(console.error).not.toBe(originalConsoleError);
		});

		it("should make progress bar active", () => {
			progressBar.start();

			// Verify by calling update - it should work
			progressBar.update("test message");
			expect(logUpdate).toHaveBeenCalledWith("test message");
		});
	});

	describe("update()", () => {
		it("should call logUpdate when active", () => {
			progressBar.start();
			progressBar.update("Building [===] 50%");

			expect(logUpdate).toHaveBeenCalledWith("Building [===] 50%");
		});

		it("should not call logUpdate when inactive", () => {
			// Don't start the progress bar
			progressBar.update("Building [===] 50%");

			expect(logUpdate).not.toHaveBeenCalled();
		});

		it("should update current message", () => {
			progressBar.start();
			progressBar.update("First message");

			// Clear mocks and trigger console output to verify message is stored
			vi.clearAllMocks();
			console.log("test");

			// Should redraw with the stored message
			expect(logUpdate).toHaveBeenCalledWith("First message");
		});
	});

	describe("done()", () => {
		it("should call logUpdate.done() when active", () => {
			progressBar.start();
			progressBar.done();

			expect(logUpdate.done).toHaveBeenCalled();
		});

		it("should restore console methods", () => {
			progressBar.start();
			progressBar.done();

			expect(console.log).toBe(originalConsoleLog);
			expect(console.error).toBe(originalConsoleError);
		});

		it("should not call logUpdate.done() when inactive", () => {
			// Don't start
			progressBar.done();

			expect(logUpdate.done).not.toHaveBeenCalled();
		});

		it("should make progress bar inactive", () => {
			progressBar.start();
			progressBar.done();

			// Verify by calling update - it shouldn't work
			vi.clearAllMocks();
			progressBar.update("test");
			expect(logUpdate).not.toHaveBeenCalled();
		});
	});

	describe("clear()", () => {
		it("should call logUpdate.clear() when active", () => {
			progressBar.start();
			progressBar.clear();

			expect(logUpdate.clear).toHaveBeenCalled();
		});

		it("should restore console methods", () => {
			progressBar.start();
			progressBar.clear();

			expect(console.log).toBe(originalConsoleLog);
			expect(console.error).toBe(originalConsoleError);
		});

		it("should not call logUpdate.clear() when inactive", () => {
			// Don't start
			progressBar.clear();

			expect(logUpdate.clear).not.toHaveBeenCalled();
		});

		it("should clear current message", () => {
			progressBar.start();
			progressBar.update("Some message");
			progressBar.clear();

			// Start again and trigger console output
			vi.clearAllMocks();
			progressBar.start();
			console.log("test");

			// Should clear but not redraw (no current message)
			expect(logUpdate.clear).toHaveBeenCalledTimes(1);
			expect(logUpdate).not.toHaveBeenCalled(); // No redraw since no message
		});
	});

	describe("console.log patching", () => {
		it("should coordinate console.log with progress bar when active", () => {
			progressBar.start();
			progressBar.update("Progress: 50%");

			vi.clearAllMocks();
			console.log("Task completed");

			// Should: clear, log, redraw
			expect(logUpdate.clear).toHaveBeenCalledTimes(1);
			expect(logUpdate).toHaveBeenCalledWith("Progress: 50%");
		});

		it("should not interfere with console.log when inactive", () => {
			// Start and then stop
			progressBar.start();
			progressBar.done();

			vi.clearAllMocks();
			console.log("Task completed");

			// Should not call any logUpdate methods
			expect(logUpdate.clear).not.toHaveBeenCalled();
			expect(logUpdate).not.toHaveBeenCalled();
		});

		it("should not redraw progress bar if no current message", () => {
			progressBar.start();
			// Don't set a message

			vi.clearAllMocks();
			console.log("Task completed");

			// Should clear but not redraw
			expect(logUpdate.clear).toHaveBeenCalledTimes(1);
			expect(logUpdate).not.toHaveBeenCalled();
		});

		it("should handle multiple console.log calls", () => {
			progressBar.start();
			progressBar.update("Progress: 25%");

			vi.clearAllMocks();
			console.log("Task 1");
			console.log("Task 2");
			console.log("Task 3");

			// Each should trigger clear and redraw
			expect(logUpdate.clear).toHaveBeenCalledTimes(3);
			expect(logUpdate).toHaveBeenCalledTimes(3);
		});
	});

	describe("console.error patching", () => {
		it("should coordinate console.error with progress bar when active", () => {
			progressBar.start();
			progressBar.update("Progress: 75%");

			vi.clearAllMocks();
			console.error("Error occurred");

			// Should: clear, error, redraw
			expect(logUpdate.clear).toHaveBeenCalledTimes(1);
			expect(logUpdate).toHaveBeenCalledWith("Progress: 75%");
		});

		it("should not interfere with console.error when inactive", () => {
			progressBar.start();
			progressBar.done();

			vi.clearAllMocks();
			console.error("Error occurred");

			// Should not call any logUpdate methods
			expect(logUpdate.clear).not.toHaveBeenCalled();
			expect(logUpdate).not.toHaveBeenCalled();
		});

		it("should handle mixed console.log and console.error calls", () => {
			progressBar.start();
			progressBar.update("Progress: 33%");

			vi.clearAllMocks();
			console.log("Info message");
			console.error("Error message");
			console.log("Another info");

			// Each should trigger clear and redraw
			expect(logUpdate.clear).toHaveBeenCalledTimes(3);
			expect(logUpdate).toHaveBeenCalledTimes(3);
			expect(logUpdate).toHaveBeenCalledWith("Progress: 33%");
		});
	});

	describe("lifecycle", () => {
		it("should support start -> update -> done workflow", () => {
			progressBar.start();
			progressBar.update("Starting...");
			progressBar.update("50% complete");
			progressBar.update("Almost done...");
			progressBar.done();

			// Should have updated 3 times and called done once
			expect(logUpdate).toHaveBeenCalledTimes(3);
			expect(logUpdate.done).toHaveBeenCalledOnce();
		});

		it("should support start -> update -> clear workflow", () => {
			progressBar.start();
			progressBar.update("Working...");
			progressBar.clear();

			// Should have updated once and called clear once
			expect(logUpdate).toHaveBeenCalledOnce();
			expect(logUpdate.clear).toHaveBeenCalledOnce();
		});

		it("should allow restarting after done", () => {
			progressBar.start();
			progressBar.update("First run");
			progressBar.done();

			vi.clearAllMocks();

			progressBar.start();
			progressBar.update("Second run");
			progressBar.done();

			expect(logUpdate).toHaveBeenCalledWith("Second run");
			expect(logUpdate.done).toHaveBeenCalledOnce();
		});

		it("should allow restarting after clear", () => {
			progressBar.start();
			progressBar.update("First run");
			progressBar.clear();

			vi.clearAllMocks();

			progressBar.start();
			progressBar.update("Second run");

			expect(logUpdate).toHaveBeenCalledWith("Second run");
		});
	});
});

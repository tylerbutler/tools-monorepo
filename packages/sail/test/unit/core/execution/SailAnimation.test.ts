import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SailAnimation } from "../../../../src/core/execution/SailAnimation.js";

// Mock log-update module
vi.mock("log-update", () => {
	const mockLogUpdate = vi.fn();
	mockLogUpdate.clear = vi.fn();
	mockLogUpdate.done = vi.fn();
	return { default: mockLogUpdate };
});

import logUpdate from "log-update";

describe("SailAnimation", () => {
	let animation: SailAnimation;

	beforeEach(() => {
		// Create fresh instance
		animation = new SailAnimation();

		// Clear all mocks
		vi.clearAllMocks();

		// Clear any existing timers
		vi.clearAllTimers();
	});

	afterEach(() => {
		// Ensure animation is stopped and timers are cleared
		if (animation.running) {
			animation.stop();
		}
		vi.clearAllTimers();
	});

	describe("constructor", () => {
		it("should create animation instance with pre-generated frames", () => {
			expect(animation).toBeInstanceOf(SailAnimation);
			expect(animation.running).toBe(false);
		});

		it("should not start animation automatically", () => {
			expect(animation.running).toBe(false);
			expect(logUpdate).not.toHaveBeenCalled();
		});
	});

	describe("start()", () => {
		it("should start the animation", () => {
			animation.start();

			expect(animation.running).toBe(true);
		});

		it("should display initial frame after first interval", () => {
			vi.useFakeTimers();

			animation.start();

			// Should not have called yet
			expect(logUpdate).not.toHaveBeenCalled();

			// Advance to first frame
			vi.advanceTimersByTime(120);
			expect(logUpdate).toHaveBeenCalled();

			vi.useRealTimers();
		});

		it("should display message if provided", () => {
			vi.useFakeTimers();

			const message = "⛵ Building...";
			animation.start(message);

			// Advance to first frame
			vi.advanceTimersByTime(120);

			// Check that the call includes the message
			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(typeof lastCall).toBe("string");
			expect(lastCall).toContain(message);

			vi.useRealTimers();
		});

		it("should not start twice if already running", () => {
			animation.start();
			vi.clearAllMocks();

			animation.start(); // Try to start again

			// Should not display another frame
			expect(logUpdate).not.toHaveBeenCalled();
		});

		it("should set up interval for frame animation", () => {
			vi.useFakeTimers();

			animation.start();
			const initialCallCount = vi.mocked(logUpdate).mock.calls.length;

			// Advance time by 120ms (one frame interval)
			vi.advanceTimersByTime(120);

			// Should have rendered another frame
			expect(vi.mocked(logUpdate).mock.calls.length).toBeGreaterThan(
				initialCallCount,
			);

			vi.useRealTimers();
		});
	});

	describe("updateMessage()", () => {
		it("should update message while animation is running", () => {
			animation.start("Initial message");
			vi.clearAllMocks();

			animation.updateMessage("Updated message");

			expect(logUpdate).toHaveBeenCalled();
			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(lastCall).toContain("Updated message");
		});

		it("should not update if animation is not running", () => {
			animation.updateMessage("Test message");

			expect(logUpdate).not.toHaveBeenCalled();
		});

		it("should preserve animation while updating message", () => {
			vi.useFakeTimers();

			animation.start("Message 1");
			animation.updateMessage("Message 2");

			// Animation should still be running
			expect(animation.running).toBe(true);

			// Advance time to verify frames continue
			const callCountBefore = vi.mocked(logUpdate).mock.calls.length;
			vi.advanceTimersByTime(120);
			expect(vi.mocked(logUpdate).mock.calls.length).toBeGreaterThan(
				callCountBefore,
			);

			vi.useRealTimers();
		});
	});

	describe("stop()", () => {
		it("should stop the animation", () => {
			animation.start();
			animation.stop();

			expect(animation.running).toBe(false);
		});

		it("should clear the display", () => {
			animation.start();
			animation.stop();

			expect(logUpdate.clear).toHaveBeenCalled();
		});

		it("should stop frame interval", () => {
			vi.useFakeTimers();

			animation.start();

			animation.stop();
			vi.clearAllMocks();

			// Advance time - should not render more frames
			vi.advanceTimersByTime(500);
			expect(logUpdate).not.toHaveBeenCalled();

			vi.useRealTimers();
		});

		it("should not throw error if called when not running", () => {
			expect(() => animation.stop()).not.toThrow();
		});

		it("should not call logUpdate.clear if not running", () => {
			animation.stop(); // Stop when never started

			expect(logUpdate.clear).not.toHaveBeenCalled();
		});
	});

	describe("done()", () => {
		it("should stop the animation", () => {
			animation.start();
			animation.done();

			expect(animation.running).toBe(false);
		});

		it("should call logUpdate.done()", () => {
			animation.start();
			animation.done();

			expect(logUpdate.done).toHaveBeenCalled();
		});

		it("should display final message if provided", () => {
			animation.start();
			vi.clearAllMocks();

			const finalMessage = "✅ Complete!";
			animation.done(finalMessage);

			// Should update with final message before calling done
			expect(logUpdate).toHaveBeenCalled();
			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(lastCall).toContain(finalMessage);
			expect(logUpdate.done).toHaveBeenCalled();
		});

		it("should stop frame interval", () => {
			vi.useFakeTimers();

			animation.start();
			animation.done();

			vi.clearAllMocks();

			// Advance time - should not render more frames
			vi.advanceTimersByTime(500);
			expect(logUpdate).not.toHaveBeenCalled();

			vi.useRealTimers();
		});

		it("should not throw error if called when not running", () => {
			expect(() => animation.done()).not.toThrow();
		});

		it("should not call logUpdate.done if not running", () => {
			animation.done(); // Done when never started

			expect(logUpdate.done).not.toHaveBeenCalled();
		});
	});

	describe("running property", () => {
		it("should return false initially", () => {
			expect(animation.running).toBe(false);
		});

		it("should return true after start()", () => {
			animation.start();
			expect(animation.running).toBe(true);
		});

		it("should return false after stop()", () => {
			animation.start();
			animation.stop();
			expect(animation.running).toBe(false);
		});

		it("should return false after done()", () => {
			animation.start();
			animation.done();
			expect(animation.running).toBe(false);
		});
	});

	describe("frame animation", () => {
		it("should cycle through multiple frames", () => {
			vi.useFakeTimers();

			animation.start();

			// Capture frames by advancing time
			const frames: string[] = [];
			for (let i = 0; i < 17; i++) {
				// 17 to complete one full cycle (16 frames + 1)
				vi.advanceTimersByTime(120);
				const calls = vi.mocked(logUpdate).mock.calls;
				if (calls.length > 0) {
					const lastCall = calls.at(-1)?.[0];
					if (typeof lastCall === "string") {
						frames.push(lastCall);
					}
				}
			}

			// Should have rendered multiple frames
			expect(frames.length).toBeGreaterThan(1);

			// Frames should be different (animation is progressing)
			const uniqueFrames = new Set(frames);
			expect(uniqueFrames.size).toBeGreaterThan(1);

			vi.useRealTimers();
		});

		it("should loop animation frames", () => {
			vi.useFakeTimers();

			animation.start();

			// Advance through more than one complete cycle (16 frames * 120ms * 2 cycles)
			const totalTime = 16 * 120 * 2;
			vi.advanceTimersByTime(totalTime);

			// Animation should still be running
			expect(animation.running).toBe(true);

			vi.useRealTimers();
		});

		it("should include boat Unicode characters in frames", () => {
			vi.useFakeTimers();

			animation.start();
			vi.advanceTimersByTime(120); // Advance to first frame

			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(typeof lastCall).toBe("string");

			// Check for boat Unicode characters (blocks, shading)
			const frame = lastCall as string;
			const hasBoatChars =
				frame.includes("▒") || // Medium shade
				frame.includes("█") || // Full block
				frame.includes("┃") || // Vertical line (mast)
				frame.includes("▀"); // Upper half block

			expect(hasBoatChars).toBe(true);

			vi.useRealTimers();
		});

		it("should include wave Unicode characters in frames", () => {
			vi.useFakeTimers();

			animation.start();
			vi.advanceTimersByTime(120); // Advance to first frame

			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(typeof lastCall).toBe("string");

			const frame = lastCall as string;

			// Check for wave Unicode characters
			const hasWaveChars =
				frame.includes("≈") || // Almost equal to
				frame.includes("~") || // Tilde
				frame.includes("∼") || // Tilde operator
				frame.includes("≋") || // Triple tilde
				frame.includes("∿") || // Sine wave
				frame.includes("░") || // Light shade
				frame.includes("▒"); // Medium shade

			expect(hasWaveChars).toBe(true);

			vi.useRealTimers();
		});
	});

	describe("lifecycle workflows", () => {
		it("should support start -> updateMessage -> done workflow", () => {
			animation.start("Starting...");
			animation.updateMessage("In progress...");
			animation.updateMessage("Almost done...");
			animation.done("Complete!");

			expect(animation.running).toBe(false);
			expect(logUpdate.done).toHaveBeenCalledOnce();
		});

		it("should support start -> stop workflow", () => {
			animation.start("Working...");
			animation.stop();

			expect(animation.running).toBe(false);
			expect(logUpdate.clear).toHaveBeenCalledOnce();
		});

		it("should allow restarting after stop", () => {
			vi.useFakeTimers();

			animation.start("First run");
			animation.stop();

			vi.clearAllMocks();

			animation.start("Second run");
			expect(animation.running).toBe(true);

			// Advance to see first frame of second run
			vi.advanceTimersByTime(120);
			expect(logUpdate).toHaveBeenCalled();

			vi.useRealTimers();
		});

		it("should allow restarting after done", () => {
			vi.useFakeTimers();

			animation.start("First run");
			animation.done("First complete");

			vi.clearAllMocks();

			animation.start("Second run");
			expect(animation.running).toBe(true);

			// Advance to see first frame of second run
			vi.advanceTimersByTime(120);
			expect(logUpdate).toHaveBeenCalled();

			vi.useRealTimers();
		});

		it("should handle rapid message updates", () => {
			animation.start();

			// Rapidly update messages
			for (let i = 0; i < 10; i++) {
				animation.updateMessage(`Message ${i}`);
			}

			// Should still be running
			expect(animation.running).toBe(true);

			animation.stop();
			expect(animation.running).toBe(false);
		});
	});

	describe("message formatting", () => {
		it("should display message below animation frames", () => {
			vi.useFakeTimers();

			const message = "Test message";
			animation.start(message);

			// Advance to first frame
			vi.advanceTimersByTime(120);

			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(typeof lastCall).toBe("string");
			expect(lastCall).toContain(message);

			// Message should appear after the boat/waves (separated by newlines)
			expect(lastCall).toMatch(/\n.*Test message/s);

			vi.useRealTimers();
		});

		it("should handle empty message", () => {
			animation.start("");

			// Should not throw, just show animation
			expect(animation.running).toBe(true);
		});

		it("should handle multiline messages", () => {
			vi.useFakeTimers();

			const multilineMessage = "Line 1\nLine 2\nLine 3";
			animation.start(multilineMessage);

			// Advance to first frame
			vi.advanceTimersByTime(120);

			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(typeof lastCall).toBe("string");
			expect(lastCall).toContain("Line 1");
			expect(lastCall).toContain("Line 2");
			expect(lastCall).toContain("Line 3");

			vi.useRealTimers();
		});

		it("should handle messages with special characters", () => {
			vi.useFakeTimers();

			const specialMessage = "⛵ Building... 🔨 [===] 50% ✅";
			animation.start(specialMessage);

			// Advance to first frame
			vi.advanceTimersByTime(120);

			const lastCall = vi.mocked(logUpdate).mock.calls[0]?.[0];
			expect(typeof lastCall).toBe("string");
			expect(lastCall).toContain(specialMessage);

			vi.useRealTimers();
		});
	});
});

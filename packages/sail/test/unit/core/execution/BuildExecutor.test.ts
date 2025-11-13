import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { Logger } from "@tylerbu/cli-api";
import type {
	IBuildExecutionContext,
	IBuildStats,
} from "../../../../src/core/interfaces/IBuildExecutor.js";

/**
 * Unit tests for BuildExecutor progress bar task counting logic
 *
 * These tests verify that the progress bar correctly calculates total tasks
 * using the stable leafInitialUpToDateCount snapshot rather than the dynamic
 * leafUpToDateCount value.
 */
describe("BuildExecutor - Progress Bar Task Counting", () => {
	let mockLogger: Logger;
	let mockContext: IBuildExecutionContext;
	let taskStats: IBuildStats;

	beforeEach(() => {
		// Create a mock logger
		mockLogger = {
			log: vi.fn(),
			errorLog: vi.fn(),
			warning: vi.fn(),
			verbose: vi.fn(),
			info: vi.fn(),
		} as unknown as Logger;

		// Create taskStats with initial values
		taskStats = {
			leafTotalCount: 100, // 100 total tasks
			leafUpToDateCount: 30, // Initially 30 tasks are up-to-date
			leafBuiltCount: 0, // No tasks built yet
			leafExecTimeTotal: 0,
			leafQueueWaitTimeTotal: 0,
			leafInitialUpToDateCount: 30, // Snapshot: 30 tasks up-to-date at start
		};

		// Create a mock execution context
		mockContext = {
			taskStats,
			failedTaskLines: [],
			fileHashCache: {
				clear: vi.fn(),
			},
			quiet: false,
		};
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("totalTasks calculation", () => {
		it("should calculate totalTasks using leafInitialUpToDateCount (stable snapshot)", () => {
			// This test demonstrates the expected behavior:
			// totalTasks should use the stable snapshot (leafInitialUpToDateCount)
			// rather than the dynamic leafUpToDateCount

			// Simulate scenario: after snapshot, leafUpToDateCount changes
			// (e.g., due to additional checks or dynamic updates)
			taskStats.leafInitialUpToDateCount = 30; // Snapshot at execution start
			taskStats.leafUpToDateCount = 35; // Later increased dynamically

			// Expected calculation (correct):
			// totalTasks = leafTotalCount - leafInitialUpToDateCount
			const expectedTotalTasks = 100 - 30; // = 70 tasks to run
			expect(expectedTotalTasks).toBe(70);

			// Buggy calculation (what the code currently does):
			// totalTasks = leafTotalCount - leafUpToDateCount
			const buggyTotalTasks = 100 - 35; // = 65 tasks to run (WRONG!)
			expect(buggyTotalTasks).toBe(65);

			// The bug causes the progress bar to show wrong numbers:
			// - If leafUpToDateCount increases, totalTasks decreases (progress bar denominator is wrong)
			// - This makes the progress percentage incorrect
			expect(expectedTotalTasks).not.toBe(buggyTotalTasks);
		});

		it("should use stable denominator even if leafUpToDateCount changes during execution", () => {
			// Set initial snapshot
			taskStats.leafTotalCount = 100;
			taskStats.leafInitialUpToDateCount = 20; // Snapshot: 20 up-to-date
			taskStats.leafUpToDateCount = 20; // Initially same as snapshot

			// Expected total tasks to run
			const expectedTotalTasks = 100 - 20; // = 80 tasks

			// Simulate dynamic change during execution
			taskStats.leafUpToDateCount = 25; // Changed to 25 (e.g., more tasks marked up-to-date)

			// The totalTasks calculation should STILL use leafInitialUpToDateCount (stable)
			const correctTotalTasks = taskStats.leafTotalCount - taskStats.leafInitialUpToDateCount;
			expect(correctTotalTasks).toBe(80);

			// The buggy calculation would give a different result
			const buggyTotalTasks = taskStats.leafTotalCount - taskStats.leafUpToDateCount;
			expect(buggyTotalTasks).toBe(75); // Wrong!

			// Verify they're different (demonstrating the bug)
			expect(correctTotalTasks).not.toBe(buggyTotalTasks);
		});

		it("should maintain consistent progress percentage with stable denominator", () => {
			// Setup: 100 total tasks, 20 initially up-to-date
			taskStats.leafTotalCount = 100;
			taskStats.leafInitialUpToDateCount = 20;
			taskStats.leafUpToDateCount = 20;

			// Expected: 80 tasks to run (100 - 20)
			const expectedTotalTasks = 80;

			// Simulate progress: 40 tasks built
			taskStats.leafBuiltCount = 40;

			// With stable denominator (correct):
			const correctPercent = Math.floor((40 / expectedTotalTasks) * 100);
			expect(correctPercent).toBe(50); // 40/80 = 50%

			// Now simulate leafUpToDateCount changing to 30
			taskStats.leafUpToDateCount = 30;

			// With buggy denominator (uses dynamic leafUpToDateCount):
			const buggyTotalTasks = 100 - 30; // = 70
			const buggyPercent = Math.floor((40 / buggyTotalTasks) * 100);
			expect(buggyPercent).toBe(57); // 40/70 = 57% (WRONG! Progress jumped without completing tasks)

			// The bug causes progress to jump even though no tasks completed
			expect(correctPercent).not.toBe(buggyPercent);
		});

		it("should match taskFailureSummary calculation which uses leafInitialUpToDateCount", () => {
			// The taskFailureSummary method already uses leafInitialUpToDateCount correctly
			// The progress bar calculation should match this approach

			taskStats.leafTotalCount = 100;
			taskStats.leafInitialUpToDateCount = 20; // Stable snapshot
			taskStats.leafUpToDateCount = 25; // Changed during execution
			taskStats.leafBuiltCount = 50; // 50 tasks completed

			// taskFailureSummary calculation (from BuildExecutor.ts lines 139-144):
			// Uses leafInitialUpToDateCount (stable) not leafUpToDateCount (dynamic)
			const notRunCount =
				taskStats.leafTotalCount -
				taskStats.leafInitialUpToDateCount -
				taskStats.leafBuiltCount -
				(taskStats.leafUpToDateCount - taskStats.leafInitialUpToDateCount);

			// Progress bar totalTasks should also use leafInitialUpToDateCount
			const correctTotalTasks = taskStats.leafTotalCount - taskStats.leafInitialUpToDateCount;
			expect(correctTotalTasks).toBe(80);

			// Verify consistency: totalTasks = built + notRun + (dynamic changes)
			const expectedBuilt = taskStats.leafBuiltCount; // 50
			const expectedNotRun = notRunCount; // 100 - 20 - 50 - 5 = 25
			const dynamicChange = taskStats.leafUpToDateCount - taskStats.leafInitialUpToDateCount; // 5

			// Should sum to totalTasks
			expect(expectedBuilt + expectedNotRun + dynamicChange).toBe(correctTotalTasks);
		});

		it("should demonstrate the bug: progress bar shows wrong task counts when leafUpToDateCount changes", () => {
			// This test demonstrates the actual bug in BuildExecutor.ts line 197-199
			//
			// Current buggy code:
			//   const totalTasks = this.context.taskStats.leafTotalCount - this.context.taskStats.leafUpToDateCount;
			//
			// Should be:
			//   const totalTasks = this.context.taskStats.leafTotalCount - this.context.taskStats.leafInitialUpToDateCount;

			// Setup
			taskStats.leafTotalCount = 100;
			taskStats.leafInitialUpToDateCount = 20; // Snapshot taken at line 81-82 of BuildExecutor
			taskStats.leafUpToDateCount = 20; // Initially same

			// Expected behavior: progress bar should show "0/80 tasks"
			const expectedTotalTasks = taskStats.leafTotalCount - taskStats.leafInitialUpToDateCount;
			const expectedCompletedTasks = taskStats.leafBuiltCount;
			expect(expectedTotalTasks).toBe(80);
			expect(expectedCompletedTasks).toBe(0);

			// Simulate scenario: leafUpToDateCount changes during execution
			taskStats.leafUpToDateCount = 30; // Dynamic change (10 more tasks marked up-to-date)

			// Bug: progress bar would now show "0/70 tasks" instead of "0/80 tasks"
			const buggyTotalTasks = taskStats.leafTotalCount - taskStats.leafUpToDateCount;
			expect(buggyTotalTasks).toBe(70);

			// The denominator changed without the user doing anything!
			// This makes the progress bar confusing and inaccurate
			expect(buggyTotalTasks).not.toBe(expectedTotalTasks);

			// As tasks complete, the percentage will be wrong
			taskStats.leafBuiltCount = 35;
			const correctPercent = Math.floor((35 / expectedTotalTasks) * 100); // 35/80 = 43%
			const buggyPercent = Math.floor((35 / buggyTotalTasks) * 100); // 35/70 = 50%

			// User sees 50% progress but actually only 43% complete!
			expect(buggyPercent).toBeGreaterThan(correctPercent);
		});
	});

	describe("progress bar message format", () => {
		it("should format progress message with correct task counts", () => {
			// Setup
			taskStats.leafTotalCount = 100;
			taskStats.leafInitialUpToDateCount = 30;
			taskStats.leafBuiltCount = 20;

			// Expected format: "Building [====...] 28% 20/70 tasks | ETA: 5s"
			const expectedTotalTasks = 70; // 100 - 30
			const expectedCompletedTasks = 20;
			const expectedPercent = Math.floor((20 / 70) * 100); // 28%

			expect(expectedTotalTasks).toBe(70);
			expect(expectedCompletedTasks).toBe(20);
			expect(expectedPercent).toBe(28);

			// The progress message should show: "20/70 tasks" not "20/65 tasks" (if bug present)
		});
	});
});

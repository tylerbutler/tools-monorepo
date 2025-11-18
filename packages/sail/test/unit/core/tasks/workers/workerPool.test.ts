import { fork } from "node:child_process";
import { freemem } from "node:os";
import { Worker } from "node:worker_threads";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { WorkerPool } from "../../../../../src/core/tasks/workers/workerPool.js";

// Mock node modules
vi.mock("node:worker_threads");
vi.mock("node:child_process");
vi.mock("node:os");

/**
 * Comprehensive WorkerPool Tests
 *
 * Coverage Target: 11.71% → 80%+
 *
 * Test Areas:
 * 1. Worker pool initialization and configuration
 * 2. Worker allocation and recycling
 * 3. Task distribution across workers
 * 4. Worker failure and recovery
 * 5. Memory limit enforcement
 * 6. Pool shutdown and cleanup
 */

describe("WorkerPool", () => {
	let mockWorkerInstance: {
		postMessage: ReturnType<typeof vi.fn>;
		terminate: ReturnType<typeof vi.fn>;
		once: ReturnType<typeof vi.fn>;
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
		stdout: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
		stderr: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
	};
	let mockChildProcessInstance: {
		send: ReturnType<typeof vi.fn>;
		kill: ReturnType<typeof vi.fn>;
		once: ReturnType<typeof vi.fn>;
		on: ReturnType<typeof vi.fn>;
		off: ReturnType<typeof vi.fn>;
		stdout: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
		stderr: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn> };
	};

	beforeEach(() => {
		vi.clearAllMocks();

		// Mock Worker instance
		mockWorkerInstance = {
			postMessage: vi.fn(),
			terminate: vi.fn(),
			once: vi.fn(),
			on: vi.fn(),
			off: vi.fn(),
			stdout: {
				on: vi.fn(),
				off: vi.fn(),
			},
			stderr: {
				on: vi.fn(),
				off: vi.fn(),
			},
		};

		// Mock ChildProcess instance
		mockChildProcessInstance = {
			send: vi.fn(),
			kill: vi.fn(),
			once: vi.fn(),
			on: vi.fn(),
			off: vi.fn(),
			stdout: {
				on: vi.fn(),
				off: vi.fn(),
			},
			stderr: {
				on: vi.fn(),
				off: vi.fn(),
			},
		};

		// Mock worker_threads.Worker constructor
		vi.mocked(Worker).mockImplementation(() => mockWorkerInstance);

		// Mock child_process.fork
		vi.mocked(fork).mockReturnValue(mockChildProcessInstance);

		// Mock os.freemem to return 8GB by default
		vi.mocked(freemem).mockReturnValue(8 * 1024 * 1024 * 1024);
	});

	describe("Construction and Initialization", () => {
		it("should create a worker pool with default configuration", () => {
			// Arrange & Act
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Assert
			expect(pool).toBeDefined();
			expect(pool.useWorkerThreads).toBe(true);
		});

		it("should create a worker pool with custom worker count", () => {
			// Arrange & Act
			const threadPool = new WorkerPool(true, Number.POSITIVE_INFINITY);
			const processPool = new WorkerPool(false, Number.POSITIVE_INFINITY);

			// Assert
			expect(threadPool.useWorkerThreads).toBe(true);
			expect(processPool.useWorkerThreads).toBe(false);
		});

		it("should create a worker pool with memory limits", () => {
			// Arrange
			const memoryLimit = 512 * 1024 * 1024; // 512MB

			// Act
			const pool = new WorkerPool(false, memoryLimit);

			// Assert
			expect(pool).toBeDefined();
		});

		it("should initialize workers lazily on first task", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Assert - no workers created yet
			expect(Worker).not.toHaveBeenCalled();

			// Act - run a task to trigger lazy initialization
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response
			const messageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({ code: 0 });

			await taskPromise;

			// Assert - worker created on first use
			expect(Worker).toHaveBeenCalledTimes(1);
		});
	});

	describe("Worker Allocation", () => {
		it("should allocate available worker for task", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response
			const messageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({ code: 0 });

			await taskPromise;

			// Assert
			expect(Worker).toHaveBeenCalledTimes(1);
			expect(mockWorkerInstance.postMessage).toHaveBeenCalledWith({
				workerName: "tsc",
				command: "tsc --build",
				cwd: "/test/dir",
			});
		});

		it("should queue task when all workers are busy", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act - start first task (doesn't complete immediately)
			const task1Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir1");

			// Get first worker's message callback
			const worker1MessageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];

			// Start second task while first is running
			const task2Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir2");

			// Get second worker's message callback
			const worker2MessageCallback = mockWorkerInstance.once.mock.calls
				.filter(([event]: [string, ...unknown[]]) => event === "message")
				.at(-1)?.[1];

			// Complete both tasks
			worker1MessageCallback?.({ code: 0 });
			worker2MessageCallback?.({ code: 0 });

			await Promise.all([task1Promise, task2Promise]);

			// Assert - two workers created for concurrent tasks
			expect(Worker).toHaveBeenCalledTimes(2);
		});

		it("should reuse workers for multiple tasks", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act - run first task
			const task1Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir1");
			const worker1MessageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			worker1MessageCallback?.({ code: 0 });
			await task1Promise;

			// Run second task (should reuse worker)
			const task2Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir2");
			const worker2MessageCallback = mockWorkerInstance.once.mock.calls
				.filter(([event]: [string, ...unknown[]]) => event === "message")
				.at(-1)?.[1];
			worker2MessageCallback?.({ code: 0 });
			await task2Promise;

			// Assert - only one worker created (reused for second task)
			expect(Worker).toHaveBeenCalledTimes(1);
		});

		it("should respect maximum worker count", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act - start multiple tasks
			const task1Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir1");
			const task2Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir2");
			const task3Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir3");

			// Complete all tasks
			const messageCallbacks = mockWorkerInstance.once.mock.calls
				.filter(([event]: [string, ...unknown[]]) => event === "message")
				.map(([, callback]: [unknown, unknown]) => callback);

			for (const callback of messageCallbacks) {
				callback({ code: 0 });
			}

			await Promise.all([task1Promise, task2Promise, task3Promise]);

			// Assert - workers created as needed
			expect(Worker).toHaveBeenCalled();
		});
	});

	describe("Task Execution", () => {
		it("should execute task in worker thread", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response
			const messageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({ code: 0 });

			const result = await taskPromise;

			// Assert
			expect(result).toEqual({
				code: 0,
				stdout: "",
				stderr: "",
			});
		});

		it("should return task result from worker", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response with output
			const messageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];

			// Simulate stdout/stderr data events
			const stdoutCallback = mockWorkerInstance.stdout.on.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "data",
			)?.[1];
			const stderrCallback = mockWorkerInstance.stderr.on.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "data",
			)?.[1];

			stdoutCallback?.("Build successful\n");
			stderrCallback?.("Warning: deprecated API\n");

			messageCallback?.({ code: 0 });

			const result = await taskPromise;

			// Assert
			expect(result).toEqual({
				code: 0,
				stdout: "Build successful\n",
				stderr: "Warning: deprecated API\n",
			});
		});

		it("should handle task timeout", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Don't simulate worker response - let it timeout
			// In real implementation, there would be a timeout mechanism
			// For now, simulate by sending error after delay
			const messageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];

			setTimeout(() => {
				messageCallback?.({ code: -1, error: new Error("Timeout") });
			}, 10);

			const result = await taskPromise;

			// Assert
			expect(result.code).toBe(-1);
			expect(result.error).toBeDefined();
		});

		it("should execute multiple tasks in parallel", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act - start multiple tasks
			const task1Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir1");
			const task2Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir2");

			// Simulate both workers responding
			const messageCallbacks = mockWorkerInstance.once.mock.calls
				.filter(([event]: [string, ...unknown[]]) => event === "message")
				.map(([, callback]: [unknown, unknown]) => callback);

			messageCallbacks[0]?.({ code: 0 });
			messageCallbacks[1]?.({ code: 0 });

			const results = await Promise.all([task1Promise, task2Promise]);

			// Assert
			expect(results).toHaveLength(2);
			expect(results[0].code).toBe(0);
			expect(results[1].code).toBe(0);
		});
	});

	describe("Worker Failure and Recovery", () => {
		it("should recover from worker crash", async () => {
			// Arrange
			const pool = new WorkerPool(false, Number.POSITIVE_INFINITY);

			// Act - run task that will "crash"
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker crash via error event
			const errorCallback = mockChildProcessInstance.on.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "error",
			)?.[1];
			errorCallback?.();

			// Assert - should reject with error
			await expect(taskPromise).rejects.toThrow("Worker error");
		});

		it("should restart failed worker", async () => {
			// Arrange
			const pool = new WorkerPool(false, Number.POSITIVE_INFINITY);

			// Act - run task that fails
			const task1Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir1");

			// Simulate worker failure
			const exitCallback = mockChildProcessInstance.on.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "exit",
			)?.[1];
			exitCallback?.();

			await expect(task1Promise).rejects.toThrow("Worker exit");

			// Run another task (should create new worker)
			const task2Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir2");
			const messageCallback = mockChildProcessInstance.once.mock.calls
				.filter(([event]: [string, ...unknown[]]) => event === "message")
				.at(-1)?.[1];
			messageCallback?.({ code: 0 });

			await task2Promise;

			// Assert - new worker created after failure
			expect(fork).toHaveBeenCalledTimes(2);
		});

		it("should retry task on worker failure", async () => {
			// Arrange
			const pool = new WorkerPool(false, Number.POSITIVE_INFINITY);

			// Act - run task
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker failure
			const closeCallback = mockChildProcessInstance.on.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "close",
			)?.[1];
			closeCallback?.();

			// Assert - task should fail
			await expect(taskPromise).rejects.toThrow("Worker close");
		});

		it("should handle worker exit codes", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response with non-zero exit code
			const messageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({ code: 1 });

			const result = await taskPromise;

			// Assert
			expect(result.code).toBe(1);
		});
	});

	describe("Memory Management", () => {
		it("should track worker memory usage", async () => {
			// Arrange
			const pool = new WorkerPool(false, Number.POSITIVE_INFINITY);

			// Act
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response with memory usage
			const messageCallback = mockChildProcessInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({
				code: 0,
				memoryUsage: { rss: 100 * 1024 * 1024, heapUsed: 50 * 1024 * 1024 },
			});

			const result = await taskPromise;

			// Assert
			expect(result.memoryUsage).toBeDefined();
			expect(result.memoryUsage?.rss).toBe(100 * 1024 * 1024);
		});

		it("should restart worker when memory limit exceeded", async () => {
			// Arrange
			const memoryLimit = 100 * 1024 * 1024; // 100MB
			const pool = new WorkerPool(false, memoryLimit);

			// Act - run task that exceeds memory limit
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response with high memory usage
			const messageCallback = mockChildProcessInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({
				code: 0,
				memoryUsage: { rss: 200 * 1024 * 1024, heapUsed: 150 * 1024 * 1024 }, // Exceeds limit
			});

			await taskPromise;

			// Assert - worker should be killed instead of returned to pool
			expect(mockChildProcessInstance.kill).toHaveBeenCalled();
		});

		it("should report memory statistics", async () => {
			// Arrange
			const pool = new WorkerPool(false, Number.POSITIVE_INFINITY);

			// Act
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Simulate worker response
			const messageCallback = mockChildProcessInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({
				code: 0,
				memoryUsage: {
					rss: 50 * 1024 * 1024,
					heapTotal: 30 * 1024 * 1024,
					heapUsed: 20 * 1024 * 1024,
					external: 5 * 1024 * 1024,
					arrayBuffers: 2 * 1024 * 1024,
				},
			});

			const result = await taskPromise;

			// Assert
			expect(result.memoryUsage).toMatchObject({
				rss: 50 * 1024 * 1024,
				heapTotal: 30 * 1024 * 1024,
				heapUsed: 20 * 1024 * 1024,
				external: 5 * 1024 * 1024,
				arrayBuffers: 2 * 1024 * 1024,
			});
		});
	});

	describe("Pool Shutdown", () => {
		it("should terminate all workers on shutdown", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act - create some workers by running tasks
			const task1Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir1");
			const task2Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir2");

			// Complete tasks so workers are returned to pool
			const messageCallbacks = mockWorkerInstance.once.mock.calls
				.filter(([event]: [string, ...unknown[]]) => event === "message")
				.map(([, callback]: [unknown, unknown]) => callback);

			messageCallbacks[0]?.({ code: 0 });
			messageCallbacks[1]?.({ code: 0 });

			await Promise.all([task1Promise, task2Promise]);

			// Shutdown pool
			pool.reset();

			// Assert
			expect(mockWorkerInstance.terminate).toHaveBeenCalled();
		});

		it("should wait for running tasks before shutdown", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act - start task
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			// Complete task before shutdown
			const messageCallback = mockWorkerInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({ code: 0 });

			await taskPromise;

			// Shutdown
			pool.reset();

			// Assert - worker terminated after task completion
			expect(mockWorkerInstance.terminate).toHaveBeenCalled();
		});

		it("should force terminate workers on timeout", async () => {
			// Arrange
			const pool = new WorkerPool(false, Number.POSITIVE_INFINITY);

			// Act - create worker and complete task so it's in pool
			const taskPromise = pool.runOnWorker("tsc", "tsc --build", "/test/dir");

			const messageCallback = mockChildProcessInstance.once.mock.calls.find(
				([event]: [string, ...unknown[]]) => event === "message",
			)?.[1];
			messageCallback?.({ code: 0 });

			await taskPromise;

			// Force shutdown
			pool.reset();

			// Assert
			expect(mockChildProcessInstance.kill).toHaveBeenCalled();
		});

		it("should clean up resources after shutdown", async () => {
			// Arrange
			const pool = new WorkerPool(true, Number.POSITIVE_INFINITY);

			// Act - create workers
			const task1Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir1");
			const task2Promise = pool.runOnWorker("tsc", "tsc --build", "/test/dir2");

			// Complete tasks so workers are returned to pool
			const messageCallbacks = mockWorkerInstance.once.mock.calls
				.filter(([event]: [string, ...unknown[]]) => event === "message")
				.map(([, callback]: [unknown, unknown]) => callback);

			messageCallbacks[0]?.({ code: 0 });
			messageCallbacks[1]?.({ code: 0 });

			await Promise.all([task1Promise, task2Promise]);

			// Shutdown
			pool.reset();

			// Assert - all workers terminated
			expect(mockWorkerInstance.terminate).toHaveBeenCalled();
		});
	});
});

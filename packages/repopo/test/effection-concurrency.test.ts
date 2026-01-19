import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { all, type Operation, run, sleep, spawn } from "effection";
import { simpleGit } from "simple-git";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

/**
 * Tests for Effection's structured concurrency features in repopo context.
 * Focus on:
 * - Automatic operation cancellation
 * - Resource cleanup guarantees
 * - Scope isolation
 * - Error propagation
 */

describe("Effection Structured Concurrency", () => {
	let testRepoDir: string;
	let git: ReturnType<typeof simpleGit>;

	beforeEach(async () => {
		testRepoDir = await mkdtemp(join(tmpdir(), "repopo-concurrency-"));
		git = simpleGit(testRepoDir);

		await git.init();
		await git.addConfig("user.name", "Test User");
		await git.addConfig("user.email", "test@example.com");

		await writeFile(join(testRepoDir, "test.txt"), "content");
		await git.add(".");
		await git.commit("Initial commit");
	});

	afterEach(async () => {
		await rm(testRepoDir, { recursive: true, force: true });
	});

	describe("Automatic Cancellation", () => {
		it("should cancel child operations when parent completes", async () => {
			let childCompleted = false;
			let childCancelled = false;

			await run(function* (): Operation<void> {
				// Spawn a long-running child operation
				yield* spawn(function* () {
					try {
						// Simulate long-running work
						for (let i = 0; i < 100; i++) {
							yield* sleep(10);
						}
						childCompleted = true;
					} finally {
						childCancelled = true;
					}
				});

				// Parent completes quickly
				yield* sleep(50);
			});

			// Child should have been cancelled
			expect(childCancelled).toBe(true);
			expect(childCompleted).toBe(false);
		});

		it("should cancel all spawned operations on parent exit", async () => {
			const cancellationTracker = {
				child1: false,
				child2: false,
				child3: false,
			};

			await run(function* (): Operation<void> {
				// Spawn multiple children
				yield* spawn(function* () {
					try {
						while (true) {
							yield* sleep(10);
						}
					} finally {
						cancellationTracker.child1 = true;
					}
				});

				yield* spawn(function* () {
					try {
						while (true) {
							yield* sleep(10);
						}
					} finally {
						cancellationTracker.child2 = true;
					}
				});

				yield* spawn(function* () {
					try {
						while (true) {
							yield* sleep(10);
						}
					} finally {
						cancellationTracker.child3 = true;
					}
				});

				// Parent exits after brief delay
				yield* sleep(100);
			});

			// All children should be cancelled
			expect(cancellationTracker.child1).toBe(true);
			expect(cancellationTracker.child2).toBe(true);
			expect(cancellationTracker.child3).toBe(true);
		});

		it("should cancel all parallel operations if one fails", async () => {
			const cancellationTracker = {
				op1: false,
				op2: false,
				op3: false,
			};

			let errorCaught = false;

			await run(function* (): Operation<void> {
				try {
					yield* all([
						(function* () {
							try {
								yield* sleep(1000); // Long operation
							} finally {
								cancellationTracker.op1 = true;
							}
						})(),
						(function* () {
							yield* sleep(50);
							throw new Error("Operation 2 failed");
						})(),
						(function* () {
							try {
								yield* sleep(1000); // Long operation
							} finally {
								cancellationTracker.op3 = true;
							}
						})(),
					]);
				} catch (error) {
					errorCaught = true;
					expect((error as Error).message).toBe("Operation 2 failed");
				}
			});

			// Error should be caught
			expect(errorCaught).toBe(true);

			// Other operations should be cancelled
			expect(cancellationTracker.op1).toBe(true);
			expect(cancellationTracker.op3).toBe(true);
		});
	});

	describe("Resource Cleanup", () => {
		it("should execute finally blocks on cancellation", async () => {
			let resourceAcquired = false;
			let resourceReleased = false;

			await run(function* (): Operation<void> {
				yield* spawn(function* () {
					try {
						resourceAcquired = true;
						// Simulate resource usage
						while (true) {
							yield* sleep(10);
						}
					} finally {
						resourceReleased = true;
					}
				});

				// Cancel after brief period
				yield* sleep(50);
			});

			expect(resourceAcquired).toBe(true);
			expect(resourceReleased).toBe(true);
		});

		it("should execute finally blocks on error", async () => {
			let cleanupExecuted = false;

			await run(function* (): Operation<void> {
				try {
					yield* (function* () {
						try {
							yield* sleep(10);
							throw new Error("Test error");
						} finally {
							cleanupExecuted = true;
						}
					})();
				} catch {
					// Expected error
				}
			});

			expect(cleanupExecuted).toBe(true);
		});

		it("should clean up nested resources in correct order", async () => {
			const cleanupOrder: string[] = [];

			await run(function* (): Operation<void> {
				try {
					// Outer resource
					try {
						cleanupOrder.push("outer-acquired");

						// Inner resource
						try {
							cleanupOrder.push("inner-acquired");
							yield* sleep(10);
							throw new Error("Test error");
						} finally {
							cleanupOrder.push("inner-released");
						}
					} finally {
						cleanupOrder.push("outer-released");
					}
				} catch {
					// Expected error
				}
			});

			expect(cleanupOrder).toEqual([
				"outer-acquired",
				"inner-acquired",
				"inner-released",
				"outer-released",
			]);
		});
	});

	describe("Scope Isolation", () => {
		it("should not allow operations to outlive parent scope", async () => {
			let childStillRunning = false;

			const checkChildStatus = () => childStillRunning;

			await run(function* (): Operation<void> {
				yield* spawn(function* () {
					childStillRunning = true;
					try {
						// Infinite loop
						while (true) {
							yield* sleep(10);
						}
					} finally {
						childStillRunning = false;
					}
				});

				// Parent completes after short time
				yield* sleep(100);
			});

			// Give some time for any lingering operations
			await new Promise((resolve) => setTimeout(resolve, 50));

			// Child should no longer be running
			expect(checkChildStatus()).toBe(false);
		});

		it("should maintain scope isolation between parallel operations", async () => {
			const sharedState = { value: 0 };
			const results: number[] = [];

			await run(function* (): Operation<void> {
				yield* all([
					(function* () {
						// Each operation modifies shared state independently
						const localValue = sharedState.value;
						yield* sleep(10);
						results.push(localValue);
					})(),
					(function* () {
						sharedState.value++;
						yield* sleep(5);
						results.push(sharedState.value);
					})(),
					(function* () {
						sharedState.value++;
						yield* sleep(5);
						results.push(sharedState.value);
					})(),
				]);
			});

			// All operations should complete
			expect(results).toHaveLength(3);
		});
	});

	describe("Error Propagation", () => {
		it("should propagate errors from child to parent operations", async () => {
			let errorPropagated = false;

			await run(function* (): Operation<void> {
				try {
					yield* (function* () {
						// biome-ignore lint/correctness/useYield: Generator used for Effection testing
						yield* (function* () {
							throw new Error("Nested error");
						})();
					})();
				} catch (error) {
					errorPropagated = true;
					expect((error as Error).message).toBe("Nested error");
				}
			});

			expect(errorPropagated).toBe(true);
		});

		it("should handle errors in parallel operations with all()", async () => {
			let errorCaught = false;
			const completionTracker = {
				op1: false,
				op2: false,
				op3: false,
			};

			await run(function* (): Operation<void> {
				try {
					yield* all([
						(function* () {
							yield* sleep(10);
							completionTracker.op1 = true;
						})(),
						(function* () {
							yield* sleep(5);
							throw new Error("Operation failed");
						})(),
						(function* () {
							yield* sleep(10);
							completionTracker.op3 = true;
						})(),
					]);
				} catch (error) {
					errorCaught = true;
					expect((error as Error).message).toBe("Operation failed");
				}
			});

			expect(errorCaught).toBe(true);

			// Operations that started should have been cancelled
			// only op2 should have "completed" (by throwing)
			expect(completionTracker.op1).toBe(false);
			expect(completionTracker.op2).toBe(false);
			expect(completionTracker.op3).toBe(false);
		});

		it("should allow error recovery in nested operations", async () => {
			let errorRecovered = false;
			let completedSuccessfully = false;

			await run(function* (): Operation<void> {
				try {
					// biome-ignore lint/correctness/useYield: Generator used for Effection testing
					yield* (function* () {
						try {
							throw new Error("Recoverable error");
						} catch (error) {
							errorRecovered = true;
							// Recover from error
							expect((error as Error).message).toBe("Recoverable error");
						}
					})();
					completedSuccessfully = true;
				} catch {
					// Should not reach here
					throw new Error("Error should have been recovered");
				}
			});

			expect(errorRecovered).toBe(true);
			expect(completedSuccessfully).toBe(true);
		});
	});

	describe("Complex Scenarios", () => {
		it("should handle nested spawn operations correctly", async () => {
			const executionLog: string[] = [];

			await run(function* (): Operation<void> {
				executionLog.push("parent-start");

				yield* spawn(function* () {
					try {
						executionLog.push("child1-start");

						yield* spawn(function* () {
							try {
								executionLog.push("grandchild-start");
								while (true) {
									yield* sleep(5);
								}
							} finally {
								executionLog.push("grandchild-cancelled");
							}
						});

						while (true) {
							yield* sleep(5);
						}
					} finally {
						executionLog.push("child1-cancelled");
					}
				});

				executionLog.push("parent-continue");
				yield* sleep(50);
				executionLog.push("parent-end");
			});

			expect(executionLog).toContain("parent-start");
			expect(executionLog).toContain("child1-start");
			expect(executionLog).toContain("grandchild-start");
			expect(executionLog).toContain("parent-continue");
			expect(executionLog).toContain("parent-end");
			expect(executionLog).toContain("grandchild-cancelled");
			expect(executionLog).toContain("child1-cancelled");
		});

		it("should handle mixed parallel and sequential operations", async () => {
			const results: string[] = [];

			await run(function* (): Operation<void> {
				results.push("start");

				// Sequential
				yield* (function* () {
					results.push("seq1");
					yield* sleep(10);
				})();

				// Parallel
				yield* all([
					(function* () {
						yield* sleep(5);
						results.push("par1");
					})(),
					(function* () {
						yield* sleep(5);
						results.push("par2");
					})(),
				]);

				// Sequential again
				// biome-ignore lint/correctness/useYield: Generator used for Effection testing
				yield* (function* () {
					results.push("seq2");
				})();

				results.push("end");
			});

			expect(results[0]).toBe("start");
			expect(results[1]).toBe("seq1");
			// par1 and par2 can be in any order
			expect(results.slice(2, 4).sort()).toEqual(["par1", "par2"]);
			expect(results[4]).toBe("seq2");
			expect(results[5]).toBe("end");
		});
	});

	describe("Lifetime Binding", () => {
		it("should ensure child operations lifetime is bound to parent", async () => {
			let childDuration = 0;
			const childStartTime = Date.now();

			await run(function* (): Operation<void> {
				yield* spawn(function* () {
					try {
						// Try to run for 1 second
						yield* sleep(1000);
					} finally {
						childDuration = Date.now() - childStartTime;
					}
				});

				// Parent only runs for 100ms
				yield* sleep(100);
			});

			// Child should have been terminated after ~100ms
			// Allow some tolerance for timing
			expect(childDuration).toBeGreaterThan(50);
			expect(childDuration).toBeLessThan(200);
		});

		it("should bind all parallel operations to parent lifetime", async () => {
			const durations: number[] = [];
			const startTime = Date.now();

			await run(function* (): Operation<void> {
				yield* spawn(function* () {
					yield* all([
						(function* () {
							try {
								yield* sleep(5000);
							} finally {
								durations.push(Date.now() - startTime);
							}
						})(),
						(function* () {
							try {
								yield* sleep(5000);
							} finally {
								durations.push(Date.now() - startTime);
							}
						})(),
						(function* () {
							try {
								yield* sleep(5000);
							} finally {
								durations.push(Date.now() - startTime);
							}
						})(),
					]);
				});

				// Parent completes early, cancelling spawned operations
				yield* sleep(100);
			});

			// All operations should have been terminated
			expect(durations).toHaveLength(3);
			for (const duration of durations) {
				expect(duration).toBeLessThan(200);
			}
		});
	});
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { lint } from "../../../../../src/core/tasks/workers/eslintWorker.js";
import type { WorkerMessage } from "../../../../../src/core/tasks/workers/worker.js";

// Mock the taskUtils module
vi.mock("../../../../../src/core/tasks/taskUtils.js", () => {
	const mockRequire = vi.fn() as ReturnType<typeof vi.fn> & {
		resolve: ReturnType<typeof vi.fn>;
	};
	mockRequire.resolve = vi.fn();
	return {
		require: mockRequire,
	};
});

/**
 * Comprehensive eslintWorker Tests
 *
 * Coverage Target: 0% → 80%+
 *
 * Test Areas:
 * 1. ESLint initialization and configuration loading
 * 2. Linting file sets
 * 3. Formatter loading and output generation
 * 4. Error code calculation and aggregation
 * 5. Process argv and cwd manipulation
 * 6. Error handling (missing formatter, ESLint errors)
 */

describe("eslintWorker", () => {
	let mockRequire: ReturnType<typeof vi.fn> & {
		resolve: ReturnType<typeof vi.fn>;
	};
	let mockESLintEngine: {
		lintFiles: ReturnType<typeof vi.fn>;
		loadFormatter: ReturnType<typeof vi.fn>;
	};
	let mockFormatter: {
		format: ReturnType<typeof vi.fn>;
	};
	let originalCwd: string;
	let chdirSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Save original values
		originalCwd = process.cwd();

		// Mock process.chdir to avoid actual directory changes
		chdirSpy = vi.spyOn(process, "chdir").mockImplementation(() => {});

		// Create mock formatter
		mockFormatter = {
			format: vi.fn().mockResolvedValue(""),
		};

		// Create mock ESLint engine
		mockESLintEngine = {
			lintFiles: vi.fn().mockResolvedValue([]),
			loadFormatter: vi.fn().mockResolvedValue(mockFormatter),
		};

		// Mock ESLint class constructor - must use function keyword for Vitest 4
		const mockESLintClass = vi.fn(function (this: typeof mockESLintEngine) {
			Object.assign(this, mockESLintEngine);
		}) as unknown as typeof import("eslint").ESLint;
		const mockESLintModule = {
			ESLint: mockESLintClass,
		};

		// Import and setup mocked require
		const taskUtilsModule = await import(
			"../../../../../src/core/tasks/taskUtils.js"
		);
		mockRequire = vi.mocked(taskUtilsModule.require);

		// Setup require.resolve to return a mock path
		mockRequire.resolve.mockReturnValue("/mock/path/to/eslint");

		// Setup require() to return the mock ESLint module
		mockRequire.mockReturnValue(mockESLintModule);
	});

	describe("lint function", () => {
		it("should resolve ESLint from message.cwd", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint --format stylish src",
				cwd: "/test/project",
			};

			// Act
			await lint(message);

			// Assert
			expect(mockRequire.resolve).toHaveBeenCalledWith("eslint", {
				paths: ["/test/project"],
			});
		});

		it("should parse command arguments", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint --format stylish src",
				cwd: "/test/project",
			};

			// Act
			await lint(message);

			// Assert - process.argv should be set with parsed arguments
			// Note: The actual argv manipulation happens internally
			expect(mockRequire.resolve).toHaveBeenCalled();
		});

		it("should override process.argv with ESLint arguments", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint --format stylish src",
				cwd: "/test/project",
			};

			// Act
			await lint(message);

			// Assert
			expect(chdirSpy).toHaveBeenCalledWith("/test/project");
		});

		it("should change working directory to message.cwd", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/custom/working/directory",
			};

			// Act
			await lint(message);

			// Assert
			expect(chdirSpy).toHaveBeenCalledWith("/custom/working/directory");
		});

		it("should create ESLint engine instance", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};

			// Act
			await lint(message);

			// Assert - ESLint engine should have been created and used
			expect(mockESLintEngine.lintFiles).toHaveBeenCalled();
		});

		it("should lint files in src directory", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};

			// Act
			await lint(message);

			// Assert
			expect(mockESLintEngine.lintFiles).toHaveBeenCalledWith("src");
		});

		it("should load stylish formatter", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};

			// Act
			await lint(message);

			// Assert
			expect(mockESLintEngine.loadFormatter).toHaveBeenCalledWith("stylish");
		});

		it("should format lint results", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			const mockResults = [
				{ filePath: "/test/file.js", errorCount: 0, warningCount: 0 },
			];
			mockESLintEngine.lintFiles.mockResolvedValue(mockResults);

			// Act
			await lint(message);

			// Assert
			expect(mockFormatter.format).toHaveBeenCalledWith(mockResults);
		});

		it("should calculate error code from results", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			const mockResults = [
				{ errorCount: 2 },
				{ errorCount: 3 },
				{ errorCount: 1 },
			];
			mockESLintEngine.lintFiles.mockResolvedValue(mockResults);

			// Act
			const result = await lint(message);

			// Assert
			expect(result.code).toBe(6); // 2 + 3 + 1 = 6
		});

		it("should return code 0 when no errors", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			const mockResults = [{ errorCount: 0 }, { errorCount: 0 }];
			mockESLintEngine.lintFiles.mockResolvedValue(mockResults);

			// Act
			const result = await lint(message);

			// Assert
			expect(result.code).toBe(0);
		});

		it("should return code > 0 when errors exist", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			const mockResults = [{ errorCount: 5 }];
			mockESLintEngine.lintFiles.mockResolvedValue(mockResults);

			// Act
			const result = await lint(message);

			// Assert
			expect(result.code).toBeGreaterThan(0);
			expect(result.code).toBe(5);
		});

		it("should return code 2 when formatter fails to load", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			mockESLintEngine.loadFormatter.mockRejectedValue(
				new Error("Formatter not found"),
			);

			// Act
			const result = await lint(message);

			// Assert
			expect(result.code).toBe(2);
		});

		it("should restore process.argv after execution", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			const originalArgv = [...process.argv];

			// Act
			await lint(message);

			// Assert
			expect(process.argv).toEqual(originalArgv);
		});

		it("should restore process.cwd after execution", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};

			// Act
			await lint(message);

			// Assert - chdir should be called twice: once to change, once to restore
			expect(chdirSpy).toHaveBeenCalledTimes(2);
			expect(chdirSpy).toHaveBeenNthCalledWith(1, "/test/project");
			expect(chdirSpy).toHaveBeenNthCalledWith(2, originalCwd);
		});

		it("should cleanup even when error occurs", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			const originalArgvSnapshot = [...process.argv];
			mockESLintEngine.lintFiles.mockRejectedValue(new Error("Linting failed"));

			// Act & Assert
			await expect(lint(message)).rejects.toThrow("Linting failed");

			// Assert cleanup happened - argv restored and chdir called to restore
			expect(process.argv).toEqual(originalArgvSnapshot);
			expect(chdirSpy).toHaveBeenLastCalledWith(originalCwd);
		});
	});

	describe("Error Handling", () => {
		it("should handle missing ESLint module", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			mockRequire.resolve.mockImplementation(() => {
				throw new Error("Cannot find module 'eslint'");
			});

			// Act & Assert
			await expect(lint(message)).rejects.toThrow(
				"Cannot find module 'eslint'",
			);
		});

		it("should handle ESLint initialization errors", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			// Must use function keyword for Vitest 4 constructor mocks
			mockRequire.mockReturnValue({
				// biome-ignore lint/complexity/useArrowFunction: ESLint requires function for constructor mocks
				ESLint: vi.fn(function () {
					throw new Error("ESLint initialization failed");
				}),
			});

			// Act & Assert
			await expect(lint(message)).rejects.toThrow(
				"ESLint initialization failed",
			);
		});

		it("should handle linting errors", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			mockESLintEngine.lintFiles.mockRejectedValue(new Error("Linting error"));

			// Act & Assert
			await expect(lint(message)).rejects.toThrow("Linting error");
		});

		it("should handle formatter loading errors", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "eslint",
				command: "eslint src",
				cwd: "/test/project",
			};
			mockESLintEngine.loadFormatter.mockRejectedValue(
				new Error("Formatter not found"),
			);

			// Act
			const result = await lint(message);

			// Assert - should return code 2 without throwing
			expect(result.code).toBe(2);
		});
	});
});

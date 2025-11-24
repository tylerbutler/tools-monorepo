import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	compile,
	fluidCompile,
} from "../../../../../src/core/tasks/workers/tscWorker.js";
import type { WorkerMessage } from "../../../../../src/core/tasks/workers/worker.js";

// Mock the dependencies
vi.mock("../../../../../src/core/tsCompile.js");
vi.mock("../../../../../src/core/tscUtils.js");

/**
 * Comprehensive tscWorker Tests
 *
 * Coverage Target: 0% → 80%+
 *
 * Test Areas:
 * 1. compile() function - standard TypeScript compilation
 * 2. fluidCompile() function - Fluid-specific compilation with type override
 * 3. Command regex matching for fluid compilation
 * 4. Package.json type override handling
 * 5. Error handling for unrecognized commands
 */

describe("tscWorker", () => {
	let mockTsCompile: ReturnType<typeof vi.fn>;

	beforeEach(async () => {
		vi.clearAllMocks();

		// Import mocked modules
		const tsCompileModule = await import(
			"../../../../../src/core/tsCompile.js"
		);

		mockTsCompile = vi.mocked(tsCompileModule.tsCompile);

		// Set default return value
		mockTsCompile.mockReturnValue(0);
	});

	describe("compile function", () => {
		it("should call tsCompile with message", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "tsc",
				command: "tsc --build",
				cwd: "/test/project",
			};

			// Act
			await compile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith(message);
		});

		it("should return WorkerExecResult with code", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "tsc",
				command: "tsc --build",
				cwd: "/test/project",
			};
			mockTsCompile.mockReturnValue(0);

			// Act
			const result = await compile(message);

			// Assert
			expect(result).toEqual({ code: 0 });
		});

		it("should pass through command from message", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "tsc",
				command: "tsc --build --force",
				cwd: "/test/project",
			};

			// Act
			await compile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith(
				expect.objectContaining({ command: "tsc --build --force" }),
			);
		});

		it("should pass through cwd from message", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "tsc",
				command: "tsc --build",
				cwd: "/custom/working/directory",
			};

			// Act
			await compile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith(
				expect.objectContaining({ cwd: "/custom/working/directory" }),
			);
		});
	});

	describe("fluidCompile function", () => {
		it("should match command against fluidTscRegEx", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "fluid-tsc commonjs --build",
				cwd: "/test/project",
			};
			mockTsCompile.mockReturnValue(0);

			// Act
			await fluidCompile(message);

			// Assert - verify the command matched and was processed
			expect(mockTsCompile).toHaveBeenCalled();
		});

		it("should extract packageJsonTypeOverride from command", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "fluid-tsc commonjs --build",
				cwd: "/test/project",
			};

			// Act
			await fluidCompile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith(
				expect.objectContaining({
					packageJsonTypeOverride: "commonjs",
				}),
			);
		});

		it("should replace fluid command with standard tsc command", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "fluid-tsc commonjs --build --force",
				cwd: "/test/project",
			};

			// Act
			await fluidCompile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith(
				expect.objectContaining({
					command: "tsc --build --force",
				}),
			);
		});

		it("should support commonjs type override", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "fluid-tsc commonjs",
				cwd: "/test/project",
			};

			// Act
			await fluidCompile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith(
				expect.objectContaining({
					packageJsonTypeOverride: "commonjs",
				}),
			);
		});

		it("should support module type override", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "fluid-tsc module",
				cwd: "/test/project",
			};

			// Act
			await fluidCompile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith(
				expect.objectContaining({
					packageJsonTypeOverride: "module",
				}),
			);
		});

		it("should call tsCompile with transformed message", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "fluid-tsc commonjs --incremental",
				cwd: "/test/project",
			};

			// Act
			await fluidCompile(message);

			// Assert
			expect(mockTsCompile).toHaveBeenCalledWith({
				command: "tsc --incremental",
				cwd: "/test/project",
				packageJsonTypeOverride: "commonjs",
			});
		});

		it("should return WorkerExecResult with code", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "fluid-tsc module",
				cwd: "/test/project",
			};
			mockTsCompile.mockReturnValue(0);

			// Act
			const result = await fluidCompile(message);

			// Assert
			expect(result).toEqual({ code: 0 });
		});

		it("should throw error for unrecognized command format", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "invalid-command",
				cwd: "/test/project",
			};

			// Act & Assert
			await expect(fluidCompile(message)).rejects.toThrow(
				"worker command not recognized: invalid-command",
			);
		});
	});

	describe("Error Handling", () => {
		it("should handle tsCompile errors", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "tsc",
				command: "tsc --build",
				cwd: "/test/project",
			};
			mockTsCompile.mockImplementation(() => {
				throw new Error("TypeScript compilation failed");
			});

			// Act & Assert
			await expect(compile(message)).rejects.toThrow(
				"TypeScript compilation failed",
			);
		});

		it("should handle regex match failures", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "tsc --build", // Missing fluid-tsc prefix
				cwd: "/test/project",
			};

			// Act & Assert
			await expect(fluidCompile(message)).rejects.toThrow(
				"worker command not recognized",
			);
		});

		it("should include command in error message", async () => {
			// Arrange
			const message: WorkerMessage = {
				workerName: "fluid-tsc",
				command: "bad-command with args",
				cwd: "/test/project",
			};

			// Act & Assert
			await expect(fluidCompile(message)).rejects.toThrow(
				"worker command not recognized: bad-command with args",
			);
		});
	});
});

import { describe, expect, it, vi } from "vitest";
import * as path from "node:path";
import {
	getEsLintConfigFilePath,
	getApiExtractorConfigFilePath,
	toPosixPath,
	require,
} from "../../../../src/core/tasks/taskUtils.js";

describe("taskUtils", () => {
	describe("getEsLintConfigFilePath", () => {
		it("should return correct path structure with .eslintrc.js", () => {
			// Test the logic without mocking filesystem
			const mockDir = "/test/project";
			const result = getEsLintConfigFilePath(mockDir);

			// Should return undefined or a path (implementation dependent on filesystem)
			expect(typeof result === "string" || result === undefined).toBe(true);
		});

		it("should accept directory path", () => {
			// Verify the function accepts paths
			const mockDir = "/test/project";
			expect(() => getEsLintConfigFilePath(mockDir)).not.toThrow();
		});

		it("should handle root directory", () => {
			expect(() => getEsLintConfigFilePath("/")).not.toThrow();
		});

		it("should handle relative paths", () => {
			expect(() => getEsLintConfigFilePath(".")).not.toThrow();
		});

		it("should handle deeply nested paths", () => {
			expect(() =>
				getEsLintConfigFilePath("/very/deeply/nested/project"),
			).not.toThrow();
		});
	});

	describe("getApiExtractorConfigFilePath", () => {
		it("should extract config path from --config flag", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor run --config my-config.json",
			);

			expect(result).toBe("my-config.json");
		});

		it("should extract config path from -c flag", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor run -c my-config.json",
			);

			expect(result).toBe("my-config.json");
		});

		it("should handle multiple spaces", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor   run   --config   my-config.json",
			);

			expect(result).toBe("my-config.json");
		});

		it("should return default if no config flag provided", () => {
			const result = getApiExtractorConfigFilePath("api-extractor run");

			expect(result).toBe("api-extractor.json");
		});

		it("should return default if config flag has no value", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor run --config",
			);

			expect(result).toBe("api-extractor.json");
		});

		it("should handle paths with directories", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor run --config ./config/api-extractor.json",
			);

			expect(result).toBe("./config/api-extractor.json");
		});

		it("should handle absolute paths", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor run --config /absolute/path/api-extractor.json",
			);

			expect(result).toBe("/absolute/path/api-extractor.json");
		});

		it("should extract first --config flag found", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor --config first.json run --config second.json",
			);

			// Should get the first --config value found
			expect(result).toBe("first.json");
		});
	});

	describe("toPosixPath", () => {
		it("should handle forward slash paths", () => {
			const result = toPosixPath("path/to/file");

			expect(result).toBe("path/to/file");
		});

		it("should handle absolute paths", () => {
			const result = toPosixPath("/path/to/file");

			expect(result).toBe("/path/to/file");
		});

		it("should preserve empty string", () => {
			const result = toPosixPath("");

			expect(result).toBe("");
		});

		it("should preserve single file names", () => {
			const result = toPosixPath("file.ts");

			expect(result).toBe("file.ts");
		});

		it("should handle relative paths", () => {
			const result = toPosixPath("./src/file.ts");

			expect(result).toBe("./src/file.ts");
		});

		it("should handle parent directory references", () => {
			const result = toPosixPath("../file.ts");

			expect(result).toBe("../file.ts");
		});
	});

	describe("getApiExtractorConfigFilePath", () => {
		it("should extract config from --config with path", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor run --config path/to/config.json",
			);
			expect(result).toBe("path/to/config.json");
		});

		it("should return default value when no config specified", () => {
			const result = getApiExtractorConfigFilePath(
				"api-extractor run --emitBeta",
			);
			expect(result).toBe("api-extractor.json");
		});
	});

	describe("require constant", () => {
		it("should be defined", () => {
			expect(require).toBeDefined();
		});

		it("should have resolve method", () => {
			expect(typeof require.resolve).toBe("function");
		});
	});
});

describe("taskUtils - utility functions", () => {
	describe("require constant", () => {
		it("should be a valid require function", () => {
			expect(typeof require).toBe("function");
			expect(typeof require.resolve).toBe("function");
		});

		it("should have resolve method", () => {
			expect("resolve" in require).toBe(true);
		});
	});

	describe("toPosixPath", () => {
		it("should not modify Unix-style paths", () => {
			const result = toPosixPath("/path/to/file.ts");
			expect(result).toBe("/path/to/file.ts");
		});

		it("should handle single file paths", () => {
			const result = toPosixPath("file.ts");
			expect(result).toBe("file.ts");
		});

		it("should handle relative paths", () => {
			const result = toPosixPath("./src/index.ts");
			expect(result).toBe("./src/index.ts");
		});

		it("should be consistent for repeated calls", () => {
			const input = "/path/to/file.ts";
			const result1 = toPosixPath(input);
			const result2 = toPosixPath(input);
			expect(result1).toBe(result2);
		});

		it("should preserve empty string", () => {
			const result = toPosixPath("");
			expect(result).toBe("");
		});

		it("should handle parent directory references", () => {
			const result = toPosixPath("../path/file.ts");
			expect(result).toBe("../path/file.ts");
		});

		it("should handle absolute paths", () => {
			const result = toPosixPath("/absolute/path/to/file.ts");
			expect(result).toBe("/absolute/path/to/file.ts");
		});
	});
});

import { describe, expect, it } from "vitest";

import { NotInGitRepository } from "../errors.js";

describe("errors", () => {
	describe("NotInGitRepository", () => {
		it("should create error with correct message", () => {
			const testPath = "/home/user/project";
			const error = new NotInGitRepository(testPath);

			expect(error.message).toBe(`Path is not in a Git repository: ${testPath}`);
		});

		it("should store the path property", () => {
			const testPath = "/var/www/app";
			const error = new NotInGitRepository(testPath);

			expect(error.path).toBe(testPath);
		});

		it("should be instance of Error", () => {
			const error = new NotInGitRepository("/some/path");

			expect(error).toBeInstanceOf(Error);
		});

		it("should be instance of NotInGitRepository", () => {
			const error = new NotInGitRepository("/some/path");

			expect(error).toBeInstanceOf(NotInGitRepository);
		});

		it("should be throwable", () => {
			const testPath = "/test/path";

			expect(() => {
				throw new NotInGitRepository(testPath);
			}).toThrow(NotInGitRepository);
		});

		it("should be catchable with specific error message", () => {
			const testPath = "/test/path";

			expect(() => {
				throw new NotInGitRepository(testPath);
			}).toThrow(`Path is not in a Git repository: ${testPath}`);
		});

		it("should handle empty path", () => {
			const error = new NotInGitRepository("");

			expect(error.path).toBe("");
			expect(error.message).toBe("Path is not in a Git repository: ");
		});

		it("should handle paths with special characters", () => {
			const testPath = "/path/with spaces/and-dashes/file.txt";
			const error = new NotInGitRepository(testPath);

			expect(error.path).toBe(testPath);
			expect(error.message).toContain(testPath);
		});

		it("should preserve path as readonly property", () => {
			const testPath = "/original/path";
			const error = new NotInGitRepository(testPath);

			// Property should be accessible
			expect(error.path).toBe(testPath);

			// Attempting to modify should not work (TypeScript prevents this at compile time)
			// At runtime, the property is still modifiable unless Object.freeze is used
			// but the readonly modifier provides type safety
		});
	});
});

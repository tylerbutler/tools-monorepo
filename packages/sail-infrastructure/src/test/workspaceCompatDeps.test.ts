import { existsSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import {
	type WorkspaceCompatDeps,
	createDefaultWorkspaceCompatDeps,
} from "../workspaceCompatDeps.js";

describe("workspaceCompatDeps", () => {
	describe("createDefaultWorkspaceCompatDeps", () => {
		it("should return object with fileExists and findFiles functions", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			expect(deps).toBeDefined();
			expect(deps).toHaveProperty("fileExists");
			expect(deps).toHaveProperty("findFiles");
			expect(typeof deps.fileExists).toBe("function");
			expect(typeof deps.findFiles).toBe("function");
		});

		it("should satisfy WorkspaceCompatDeps interface", () => {
			const deps: WorkspaceCompatDeps = createDefaultWorkspaceCompatDeps();

			// Type check - if this compiles, interface is satisfied
			expect(deps).toBeDefined();
		});
	});

	describe("fileExists function", () => {
		it("should return true for existing files", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			// This test file should exist
			expect(deps.fileExists(__filename)).toBe(true);
		});

		it("should return false for non-existent files", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			expect(
				deps.fileExists("/this/path/absolutely/does/not/exist.ts"),
			).toBe(false);
		});

		it("should delegate to existsSync", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			// Verify it behaves like existsSync
			const testPath = __filename;
			expect(deps.fileExists(testPath)).toBe(existsSync(testPath));
		});

		it("should handle directory paths", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			// __dirname should exist
			expect(deps.fileExists(__dirname)).toBe(true);
		});
	});

	describe("findFiles function", () => {
		it("should find files matching glob patterns", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			// Find TypeScript test files in current directory
			const files = deps.findFiles(["*.test.ts"], { cwd: __dirname });

			expect(Array.isArray(files)).toBe(true);
			expect(files.length).toBeGreaterThan(0);
			expect(files.some((f) => f.includes("workspaceCompatDeps.test.ts"))).toBe(
				true,
			);
		});

		it("should return empty array when no files match", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			const files = deps.findFiles(["*.nonexistent-extension"], {
				cwd: __dirname,
			});

			expect(Array.isArray(files)).toBe(true);
			expect(files).toEqual([]);
		});

		it("should support multiple patterns", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			// Find both .ts and .js files
			const files = deps.findFiles(["*.ts", "*.mjs"], {
				cwd: __dirname,
				absolute: false,
			});

			expect(files.length).toBeGreaterThan(0);
		});

		it("should respect cwd option", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			// Search in parent directory
			const parentDir = join(__dirname, "..");
			const files = deps.findFiles(["*.ts"], {
				cwd: parentDir,
				absolute: false,
			});

			expect(files.length).toBeGreaterThan(0);
			// Should find files in the parent directory (src/)
			expect(files.some((f) => f.endsWith(".ts"))).toBe(true);
		});

		it("should support absolute path option", () => {
			const deps = createDefaultWorkspaceCompatDeps();

			const files = deps.findFiles(["*.test.ts"], {
				cwd: __dirname,
				absolute: true,
			});

			expect(files.length).toBeGreaterThan(0);
			// With absolute: true, paths should be absolute
			expect(files.every((f) => f.startsWith("/"))).toBe(true);
		});
	});
});

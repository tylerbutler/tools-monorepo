import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RequiredGitignorePatterns } from "../../src/policies/RequiredGitignorePatterns.js";

/**
 * These tests verify the internal utility functions of RequiredGitignorePatterns policy.
 */
describe("RequiredGitignorePatterns utility functions", () => {
	let testDir: string;
	let gitignoreFile: string;

	beforeEach(() => {
		testDir = join(
			tmpdir(),
			`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(testDir, { recursive: true });
		gitignoreFile = join(testDir, ".gitignore");
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("patternExists function (tested indirectly)", () => {
		it("should match exact patterns", async () => {
			writeFileSync(
				gitignoreFile,
				`node_modules/
dist/
.env
`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["node_modules/", "dist/", ".env"] },
			});

			expect(result).toBe(true);
		});

		it("should match patterns with inline comments", async () => {
			writeFileSync(
				gitignoreFile,
				`node_modules/ # npm dependencies
dist/ # build output
.env # environment variables
`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["node_modules/", "dist/", ".env"] },
			});

			expect(result).toBe(true);
		});

		it("should match patterns with tabs before comments", async () => {
			writeFileSync(
				gitignoreFile,
				`node_modules/\t# npm dependencies
dist/\t# build output
.env\t# environment variables
`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["node_modules/", "dist/", ".env"] },
			});

			expect(result).toBe(true);
		});

		it("should match patterns with spaces before comments", async () => {
			writeFileSync(
				gitignoreFile,
				`node_modules/ # npm dependencies
dist/  # build output
.env   # environment variables
`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["node_modules/", "dist/", ".env"] },
			});

			expect(result).toBe(true);
		});

		it("should ignore empty lines", async () => {
			writeFileSync(
				gitignoreFile,
				`
node_modules/

dist/

.env

`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["node_modules/", "dist/", ".env"] },
			});

			expect(result).toBe(true);
		});

		it("should handle patterns with special characters", async () => {
			writeFileSync(
				gitignoreFile,
				`*.log
!important.log
.env.*
`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["*.log", "!important.log", ".env.*"] },
			});

			expect(result).toBe(true);
		});
	});

	describe("findMissingPatterns function (tested indirectly)", () => {
		it("should identify all missing patterns", async () => {
			writeFileSync(gitignoreFile, "node_modules/\n");

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: {
					patterns: ["node_modules/", "dist/", ".env", "build/"],
				},
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("dist/");
				expect(result.errorMessage).toContain(".env");
				expect(result.errorMessage).toContain("build/");
				expect(result.errorMessage).not.toContain("node_modules/");
			}
		});

		it("should handle pattern objects with comments", async () => {
			writeFileSync(gitignoreFile, "");

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: {
					patterns: [
						{ pattern: "node_modules/", comment: "Dependencies" },
						{ pattern: ".env", comment: "Environment" },
					],
				},
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("node_modules/");
				expect(result.errorMessage).toContain(".env");
			}
		});

		it("should handle mix of string and object patterns", async () => {
			writeFileSync(gitignoreFile, "node_modules/\n");

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: {
					patterns: [
						"node_modules/",
						{ pattern: "dist/", comment: "Build output" },
						".env",
					],
				},
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("dist/");
				expect(result.errorMessage).toContain(".env");
				expect(result.errorMessage).not.toContain("node_modules/");
			}
		});
	});

	describe("addPatternsToContent function (tested indirectly)", () => {
		it("should add missing patterns with proper formatting", async () => {
			writeFileSync(gitignoreFile, "node_modules/\n");

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: {
					patterns: [
						"node_modules/",
						{ pattern: "dist/", comment: "Build output" },
						".env",
					],
				},
			});

			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			const content = readFileSync(gitignoreFile, "utf-8");
			expect(content).toContain("# Added by repopo RequiredGitignorePatterns");
			expect(content).toContain("# Build output");
			expect(content).toContain("dist/");
			expect(content).toContain(".env");
		});

		it("should preserve existing content when adding patterns", async () => {
			const originalContent = `# My custom gitignore
node_modules/
# Keep this comment
`;
			writeFileSync(gitignoreFile, originalContent);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: {
					patterns: ["node_modules/", "dist/"],
				},
			});

			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			const content = readFileSync(gitignoreFile, "utf-8");
			expect(content).toContain("# My custom gitignore");
			expect(content).toContain("# Keep this comment");
			expect(content).toContain("dist/");
		});

		it("should add newline if file doesn't end with one", async () => {
			writeFileSync(gitignoreFile, "node_modules/"); // No trailing newline

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: {
					patterns: ["node_modules/", "dist/"],
				},
			});

			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			const content = readFileSync(gitignoreFile, "utf-8");
			// Should have proper line breaks
			expect(content).toMatch(/node_modules\/\n/);
			expect(content.endsWith("\n")).toBe(true);
		});

		it("should handle adding multiple patterns at once", async () => {
			writeFileSync(gitignoreFile, "");

			const patterns = [
				{ pattern: "node_modules/", comment: "Dependencies" },
				{ pattern: "dist/", comment: "Build output" },
				".env",
				{ pattern: ".env.*", comment: "Environment files" },
				"!.env.example",
			];

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: { patterns },
			});

			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			const content = readFileSync(gitignoreFile, "utf-8");
			expect(content).toContain("# Dependencies");
			expect(content).toContain("node_modules/");
			expect(content).toContain("# Build output");
			expect(content).toContain("dist/");
			expect(content).toContain(".env");
			expect(content).toContain("# Environment files");
			expect(content).toContain(".env.*");
			expect(content).toContain("!.env.example");
		});
	});

	describe("createGitignoreContent function (tested indirectly)", () => {
		it("should create .gitignore with header comment", async () => {
			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: {
					patterns: ["node_modules/", "dist/"],
				},
			});

			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			const content = readFileSync(gitignoreFile, "utf-8");
			expect(content).toContain("Generated by repopo");
			expect(content).toContain("node_modules/");
			expect(content).toContain("dist/");
		});

		it("should create .gitignore with pattern comments", async () => {
			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: {
					patterns: [
						{ pattern: "node_modules/", comment: "Dependencies" },
						{ pattern: "dist/", comment: "Build output" },
					],
				},
			});

			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			const content = readFileSync(gitignoreFile, "utf-8");
			expect(content).toContain("# Dependencies");
			expect(content).toContain("node_modules/");
			expect(content).toContain("# Build output");
			expect(content).toContain("dist/");
		});

		it("should create .gitignore with mixed string and object patterns", async () => {
			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: {
					patterns: [
						{ pattern: "node_modules/", comment: "Dependencies" },
						".env",
						{ pattern: "dist/", comment: "Build" },
						"*.log",
					],
				},
			});

			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			const content = readFileSync(gitignoreFile, "utf-8");
			expect(content).toContain("# Dependencies");
			expect(content).toContain("node_modules/");
			expect(content).toContain(".env");
			expect(content).toContain("# Build");
			expect(content).toContain("dist/");
			expect(content).toContain("*.log");
		});
	});

	describe("error handling in handleMissingGitignore", () => {
		it("should return error if write fails", async () => {
			// Create a directory where .gitignore would be
			// This will cause writeFileSync to fail
			const badGitignoreDir = join(testDir, ".gitignore");
			mkdirSync(badGitignoreDir, { recursive: true });

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: true,
				config: {
					patterns: ["node_modules/"],
				},
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(false);
				expect(result.errorMessage).toContain("Failed to create .gitignore");
			}
		});
	});

	describe("error handling in handleExistingGitignore", () => {
		it("should return error if write fails during auto-fix", async () => {
			// Create initial .gitignore
			writeFileSync(gitignoreFile, "node_modules/\n");

			// Now make it read-only to cause write failure
			// Note: This might not work on all systems/permissions
			const fs = await import("node:fs");
			fs.chmodSync(gitignoreFile, 0o444); // Read-only

			try {
				const result = await RequiredGitignorePatterns.handler({
					file: ".gitignore",
					root: testDir,
					resolve: true,
					config: {
						patterns: ["node_modules/", "dist/"],
					},
				});

				expect(result).not.toBe(true);
				if (typeof result === "object" && "resolved" in result) {
					expect(result.resolved).toBe(false);
					expect(result.errorMessage).toContain("Failed to update .gitignore");
				}
			} finally {
				// Restore write permissions for cleanup
				fs.chmodSync(gitignoreFile, 0o644);
			}
		});
	});

	describe("whitespace handling", () => {
		it("should handle patterns with leading whitespace", async () => {
			writeFileSync(
				gitignoreFile,
				`   node_modules/
  dist/
\t.env
`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["node_modules/", "dist/", ".env"] },
			});

			expect(result).toBe(true);
		});

		it("should handle patterns with trailing whitespace", async () => {
			writeFileSync(
				gitignoreFile,
				`node_modules/
dist/
.env\t
`,
			);

			const result = await RequiredGitignorePatterns.handler({
				file: ".gitignore",
				root: testDir,
				resolve: false,
				config: { patterns: ["node_modules/", "dist/", ".env"] },
			});

			expect(result).toBe(true);
		});
	});
});

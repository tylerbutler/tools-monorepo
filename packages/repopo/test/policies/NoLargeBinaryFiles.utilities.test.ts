import { describe, expect, it } from "vitest";

/**
 * These tests verify the internal utility functions of NoLargeBinaryFiles policy.
 * Since these are not exported, we test them indirectly through the policy behavior.
 */
describe("NoLargeBinaryFiles utility functions", () => {
	describe("formatBytes function (tested indirectly)", () => {
		it("should format bytes correctly in error messages", async () => {
			// Import dynamically to access the policy
			const { NoLargeBinaryFiles } = await import(
				"../../src/policies/NoLargeBinaryFiles.js"
			);
			const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("pathe");

			const testDir = join(
				tmpdir(),
				`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			mkdirSync(testDir, { recursive: true });

			try {
				// Test byte formatting for various sizes
				// Note: We skip GB sizes because Buffer.alloc has a max size limit
				const testCases = [
					{ size: 100, expected: "100.0 B" },
					{ size: 1024, expected: "1.0 KB" },
					{ size: 1536, expected: "1.5 KB" },
					{ size: 1024 * 1024, expected: "1.0 MB" },
					{ size: Math.floor(5.5 * 1024 * 1024), expected: "5.5 MB" },
					{ size: 10 * 1024 * 1024, expected: "10.0 MB" },
					{ size: 50 * 1024 * 1024, expected: "50.0 MB" },
				];

				for (const { size, expected } of testCases) {
					const fileName = `test-${size}.bin`;
					const filePath = join(testDir, fileName);
					const buffer = Buffer.alloc(size, 0);
					writeFileSync(filePath, buffer);

					const result = await NoLargeBinaryFiles.handler({
						file: fileName,
						root: testDir,
						resolve: false,
						config: { maxSizeBytes: 50 }, // Very small to trigger error
					});

					if (typeof result === "object") {
						expect(result.errorMessages?.[0]).toContain(expected);
					}
				}
			} finally {
				rmSync(testDir, { recursive: true, force: true });
			}
		});

		it("should format zero bytes correctly", async () => {
			const { NoLargeBinaryFiles } = await import(
				"../../src/policies/NoLargeBinaryFiles.js"
			);
			const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("pathe");

			const testDir = join(
				tmpdir(),
				`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			mkdirSync(testDir, { recursive: true });

			try {
				const fileName = "zero.bin";
				const filePath = join(testDir, fileName);
				writeFileSync(filePath, "");

				// Zero-byte file should always pass
				const result = await NoLargeBinaryFiles.handler({
					file: fileName,
					root: testDir,
					resolve: false,
					config: { maxSizeBytes: 1 },
				});

				expect(result).toBe(true);
			} finally {
				rmSync(testDir, { recursive: true, force: true });
			}
		});
	});

	describe("globToRegex function (tested indirectly)", () => {
		it("should handle wildcard patterns in excludePatterns", async () => {
			const { NoLargeBinaryFiles } = await import(
				"../../src/policies/NoLargeBinaryFiles.js"
			);
			const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("pathe");

			const testDir = join(
				tmpdir(),
				`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			mkdirSync(testDir, { recursive: true });

			try {
				// Test various glob patterns
				const testCases = [
					{ pattern: "build/*", file: "build/output.bin", shouldExclude: true },
					{
						pattern: "build/*",
						file: "build/nested/file.bin",
						shouldExclude: true,
					},
					{ pattern: "*.tmp", file: "file.tmp", shouldExclude: true },
					{ pattern: "test-*", file: "test-file.bin", shouldExclude: true },
					{ pattern: "*-cache", file: "node-cache", shouldExclude: true },
					{
						pattern: "dist/**/*",
						file: "dist/nested/deep/file.bin",
						shouldExclude: true,
					},
				];

				for (const { pattern, file, shouldExclude } of testCases) {
					const parts = file.split("/");
					const dirs = parts.slice(0, -1);
					if (dirs.length > 0) {
						mkdirSync(join(testDir, ...dirs), { recursive: true });
					}

					const filePath = join(testDir, file);
					// Create large file that would fail without exclusion
					const buffer = Buffer.alloc(15 * 1024 * 1024, 0);
					writeFileSync(filePath, buffer);

					const result = await NoLargeBinaryFiles.handler({
						file,
						root: testDir,
						resolve: false,
						config: { excludePatterns: [pattern] },
					});

					if (shouldExclude) {
						expect(result).toBe(true);
					}
				}
			} finally {
				rmSync(testDir, { recursive: true, force: true });
			}
		});

		it("should handle regex special characters in patterns", async () => {
			const { NoLargeBinaryFiles } = await import(
				"../../src/policies/NoLargeBinaryFiles.js"
			);
			const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("pathe");

			const testDir = join(
				tmpdir(),
				`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			mkdirSync(testDir, { recursive: true });

			try {
				// Test patterns with special regex characters that should be escaped
				const testCases = [
					{ pattern: "file.test.bin", file: "file.test.bin" },
					{ pattern: "file+test.bin", file: "file+test.bin" },
					{ pattern: "file(1).bin", file: "file(1).bin" },
					{ pattern: "file[1].bin", file: "file[1].bin" },
				];

				for (const { pattern, file } of testCases) {
					const filePath = join(testDir, file);
					const buffer = Buffer.alloc(15 * 1024 * 1024, 0);
					writeFileSync(filePath, buffer);

					const result = await NoLargeBinaryFiles.handler({
						file,
						root: testDir,
						resolve: false,
						config: { excludePatterns: [pattern] },
					});

					// Should be excluded because pattern matches exactly
					expect(result).toBe(true);
				}
			} finally {
				rmSync(testDir, { recursive: true, force: true });
			}
		});
	});

	describe("isExcluded function (tested indirectly)", () => {
		it("should check extensions case-insensitively", async () => {
			const { NoLargeBinaryFiles } = await import(
				"../../src/policies/NoLargeBinaryFiles.js"
			);
			const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("pathe");

			const testDir = join(
				tmpdir(),
				`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			mkdirSync(testDir, { recursive: true });

			try {
				const files = ["test.TXT", "test.JSON", "test.MD"];

				for (const file of files) {
					const filePath = join(testDir, file);
					// Create large file that would fail without exclusion
					const buffer = Buffer.alloc(15 * 1024 * 1024, 0);
					writeFileSync(filePath, buffer);

					const result = await NoLargeBinaryFiles.handler({
						file,
						root: testDir,
						resolve: false,
						// Default config has .txt, .json, .md in lowercase
					});

					// Should pass because extensions are matched case-insensitively
					expect(result).toBe(true);
				}
			} finally {
				rmSync(testDir, { recursive: true, force: true });
			}
		});

		it("should handle files with no extension", async () => {
			const { NoLargeBinaryFiles } = await import(
				"../../src/policies/NoLargeBinaryFiles.js"
			);
			const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("pathe");

			const testDir = join(
				tmpdir(),
				`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			mkdirSync(testDir, { recursive: true });

			try {
				const fileName = "README";
				const filePath = join(testDir, fileName);
				const buffer = Buffer.alloc(15 * 1024 * 1024, 0);
				writeFileSync(filePath, buffer);

				const result = await NoLargeBinaryFiles.handler({
					file: fileName,
					root: testDir,
					resolve: false,
				});

				// Should fail because no extension to match against default exclusions
				expect(result).not.toBe(true);
			} finally {
				rmSync(testDir, { recursive: true, force: true });
			}
		});

		it("should handle substring pattern matching without wildcards", async () => {
			const { NoLargeBinaryFiles } = await import(
				"../../src/policies/NoLargeBinaryFiles.js"
			);
			const { mkdirSync, writeFileSync, rmSync } = await import("node:fs");
			const { tmpdir } = await import("node:os");
			const { join } = await import("pathe");

			const testDir = join(
				tmpdir(),
				`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
			);
			mkdirSync(testDir, { recursive: true });

			try {
				// Pattern without wildcard should use substring matching
				const fileName = "node_modules/package/large.bin";
				const dirs = fileName.split("/").slice(0, -1);
				mkdirSync(join(testDir, ...dirs), { recursive: true });

				const filePath = join(testDir, fileName);
				const buffer = Buffer.alloc(15 * 1024 * 1024, 0);
				writeFileSync(filePath, buffer);

				const result = await NoLargeBinaryFiles.handler({
					file: fileName,
					root: testDir,
					resolve: false,
					config: { excludePatterns: ["node_modules"] }, // No wildcard
				});

				// Should be excluded via substring match
				expect(result).toBe(true);
			} finally {
				rmSync(testDir, { recursive: true, force: true });
			}
		});
	});
});

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoLargeBinaryFiles } from "../../src/policies/NoLargeBinaryFiles.js";

describe("NoLargeBinaryFiles", () => {
	let testDir: string;

	beforeEach(() => {
		// Create a unique test directory
		testDir = join(
			tmpdir(),
			`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		// Clean up test directory
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("policy matching", () => {
		it("should match all files", () => {
			expect(NoLargeBinaryFiles.match.test("package.json")).toBe(true);
			expect(NoLargeBinaryFiles.match.test("src/index.ts")).toBe(true);
			expect(NoLargeBinaryFiles.match.test("image.png")).toBe(true);
			expect(NoLargeBinaryFiles.match.test("data.bin")).toBe(true);
		});
	});

	describe("small files", () => {
		it("should pass for small text files", async () => {
			const smallFile = join(testDir, "small.txt");
			writeFileSync(smallFile, "Hello world!");

			const result = await NoLargeBinaryFiles.handler({
				file: "small.txt",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass for medium-sized files under default limit", async () => {
			const mediumFile = join(testDir, "medium.bin");
			// Create a 5MB file (under 10MB default limit)
			const content = Buffer.alloc(5 * 1024 * 1024, 0);
			writeFileSync(mediumFile, content);

			const result = await NoLargeBinaryFiles.handler({
				file: "medium.bin",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("large files", () => {
		it("should fail for files over default size limit", async () => {
			const largeFile = join(testDir, "large.bin");
			// Create a 15MB file (over 10MB default limit)
			const content = Buffer.alloc(15 * 1024 * 1024, 0);
			writeFileSync(largeFile, content);

			const result = await NoLargeBinaryFiles.handler({
				file: "large.bin",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.name).toBe("NoLargeBinaryFiles");
				expect(result.autoFixable).toBe(false);
				expect(result.errorMessages.join()).toContain("File is too large");
				expect(result.errorMessages.join()).toContain("15.0 MB");
				expect(result.errorMessages.join()).toContain("10.0 MB");
				expect(result.errorMessages.join()).toContain("Git LFS");
			}
		});

		it("should not auto-fix large files", async () => {
			const largeFile = join(testDir, "large.bin");
			const content = Buffer.alloc(15 * 1024 * 1024, 0);
			writeFileSync(largeFile, content);

			const result = await NoLargeBinaryFiles.handler({
				file: "large.bin",
				root: testDir,
				resolve: true,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
				expect("resolved" in result).toBe(false);
			}
		});
	});

	describe("excluded file types", () => {
		it("should pass for excluded text file extensions by default", async () => {
			const textFiles = [
				"README.md",
				"package.json",
				"src/index.ts",
				"styles.css",
				"config.yml",
			];

			for (const fileName of textFiles) {
				const filePath = join(testDir, fileName);
				mkdirSync(
					join(testDir, fileName.includes("/") ? fileName.split("/")[0] : ""),
					{ recursive: true },
				);

				// Create a large text file that would normally fail
				const content = "x".repeat(15 * 1024 * 1024);
				writeFileSync(filePath, content);

				const result = await NoLargeBinaryFiles.handler({
					file: fileName,
					root: testDir,
					resolve: false,
				});

				expect(result).toBe(true);
			}
		});
	});

	describe("custom configuration", () => {
		it("should use custom size limit", async () => {
			const file = join(testDir, "test.bin");
			// Create a 2MB file
			const content = Buffer.alloc(2 * 1024 * 1024, 0);
			writeFileSync(file, content);

			const customConfig = {
				maxSizeBytes: 1 * 1024 * 1024, // 1MB limit
			};

			const result = await NoLargeBinaryFiles.handler({
				file: "test.bin",
				root: testDir,
				resolve: false,
				config: customConfig,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("2.0 MB");
				expect(result.errorMessages.join()).toContain("1.0 MB");
			}
		});

		it("should use custom exclude extensions", async () => {
			const file = join(testDir, "large.data");
			// Create a large file with custom extension
			const content = Buffer.alloc(15 * 1024 * 1024, 0);
			writeFileSync(file, content);

			const customConfig = {
				excludeExtensions: [".data"],
			};

			const result = await NoLargeBinaryFiles.handler({
				file: "large.data",
				root: testDir,
				resolve: false,
				config: customConfig,
			});

			expect(result).toBe(true);
		});

		it("should use custom exclude patterns", async () => {
			const file = join(testDir, "assets/large-image.png");
			mkdirSync(join(testDir, "assets"), { recursive: true });

			// Create a large image file
			const content = Buffer.alloc(15 * 1024 * 1024, 0);
			writeFileSync(file, content);

			const customConfig = {
				excludePatterns: ["assets/*"],
			};

			const result = await NoLargeBinaryFiles.handler({
				file: "assets/large-image.png",
				root: testDir,
				resolve: false,
				config: customConfig,
			});

			expect(result).toBe(true);
		});

		it("should handle glob-like patterns in excludePatterns", async () => {
			const files = [
				"build/output.bin",
				"dist/bundle.js",
				"node_modules/package/large.bin",
			];

			for (const fileName of files) {
				const filePath = join(testDir, fileName);
				mkdirSync(join(testDir, fileName.split("/").slice(0, -1).join("/")), {
					recursive: true,
				});

				const content = Buffer.alloc(15 * 1024 * 1024, 0);
				writeFileSync(filePath, content);
			}

			const customConfig = {
				excludePatterns: ["build/*", "dist/*", "node_modules/*"],
			};

			for (const fileName of files) {
				const result = await NoLargeBinaryFiles.handler({
					file: fileName,
					root: testDir,
					resolve: false,
					config: customConfig,
				});

				expect(result).toBe(true);
			}
		});
	});

	describe("edge cases", () => {
		it("should handle missing files gracefully", async () => {
			const result = await NoLargeBinaryFiles.handler({
				file: "nonexistent.bin",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should handle directories", async () => {
			const subDir = join(testDir, "subdir");
			mkdirSync(subDir);

			const result = await NoLargeBinaryFiles.handler({
				file: "subdir",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should handle zero-byte files", async () => {
			const emptyFile = join(testDir, "empty.bin");
			writeFileSync(emptyFile, "");

			const result = await NoLargeBinaryFiles.handler({
				file: "empty.bin",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should format file sizes correctly", async () => {
			const sizes = [
				{ bytes: 512, expected: "512.0 B" },
				{ bytes: 1536, expected: "1.5 KB" },
				{ bytes: 2 * 1024 * 1024, expected: "2.0 MB" },
				{ bytes: 1.5 * 1024 * 1024 * 1024, expected: "1.5 GB" },
			];

			for (const { bytes, expected } of sizes) {
				const file = join(testDir, `test-${bytes}.bin`);
				const content = Buffer.alloc(bytes, 0);
				writeFileSync(file, content);

				const result = await NoLargeBinaryFiles.handler({
					file: `test-${bytes}.bin`,
					root: testDir,
					resolve: false,
					config: { maxSizeBytes: 100 }, // Very small limit to trigger error
				});

				if (typeof result === "object") {
					expect(result.errorMessages.join()).toContain(expected);
				}
			}
		});
	});
});

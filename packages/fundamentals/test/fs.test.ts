import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { exists } from "../src/fs.js";

describe("fs utilities", () => {
	let tempDir: string;

	beforeEach(async () => {
		tempDir = await mkdtemp(path.join(tmpdir(), "fs-test-"));
	});

	afterEach(async () => {
		await rm(tempDir, { recursive: true, force: true });
	});

	describe("exists()", () => {
		it("returns true for existing file", async () => {
			const filePath = path.join(tempDir, "test-file.txt");
			await writeFile(filePath, "test content");

			const result = await exists(filePath);
			expect(result).toBe(true);
		});

		it("returns true for existing directory", async () => {
			const dirPath = path.join(tempDir, "test-dir");
			await mkdir(dirPath);

			const result = await exists(dirPath);
			expect(result).toBe(true);
		});

		it("returns false for non-existent file", async () => {
			const filePath = path.join(tempDir, "non-existent.txt");

			const result = await exists(filePath);
			expect(result).toBe(false);
		});

		it("returns false for non-existent directory", async () => {
			const dirPath = path.join(tempDir, "non-existent-dir");

			const result = await exists(dirPath);
			expect(result).toBe(false);
		});

		it("returns false for empty string path", async () => {
			const result = await exists("");
			expect(result).toBe(false);
		});

		it("returns true for nested file path", async () => {
			const nestedDir = path.join(tempDir, "nested", "path");
			const filePath = path.join(nestedDir, "file.txt");

			await mkdir(nestedDir, { recursive: true });
			await writeFile(filePath, "nested content");

			const result = await exists(filePath);
			expect(result).toBe(true);
		});

		it("returns false for nested non-existent path", async () => {
			const nestedPath = path.join(tempDir, "does", "not", "exist", "file.txt");

			const result = await exists(nestedPath);
			expect(result).toBe(false);
		});

		it("handles paths with special characters", async () => {
			const specialPath = path.join(tempDir, "test file with spaces.txt");
			await writeFile(specialPath, "content");

			const result = await exists(specialPath);
			expect(result).toBe(true);
		});
	});
});

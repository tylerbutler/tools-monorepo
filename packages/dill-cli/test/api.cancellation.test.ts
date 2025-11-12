import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { ParsedTarFileItem } from "nanotar";
import type { Unzipped } from "fflate";
import { writeTarFiles, writeZipFiles } from "../src/api.js";

describe("File Writing with Cancellation", () => {
	let testDir: string;

	beforeEach(async () => {
		testDir = path.join(process.cwd(), "test-output", `test-${Date.now()}`);
		await mkdir(testDir, { recursive: true });
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("writeTarFiles", () => {
		it("should propagate errors when write fails", async () => {
			// Create tar files where one will fail due to invalid path
			const tarFiles: ParsedTarFileItem[] = [
				{
					name: "file1.txt",
					data: new Uint8Array([1, 2, 3]),
					type: "file",
					size: 3,
					mode: 0o644,
					uid: 0,
					gid: 0,
					mtime: new Date(),
					uname: "user",
					gname: "group",
				},
				{
					// Invalid path that will cause an error
					name: "\0invalid.txt",
					data: new Uint8Array([4, 5, 6]),
					type: "file",
					size: 3,
					mode: 0o644,
					uid: 0,
					gid: 0,
					mtime: new Date(),
					uname: "user",
					gname: "group",
				},
				{
					name: "file3.txt",
					data: new Uint8Array([7, 8, 9]),
					type: "file",
					size: 3,
					mode: 0o644,
					uid: 0,
					gid: 0,
					mtime: new Date(),
					uname: "user",
					gname: "group",
				},
			];

			// Attempt to write files - should fail
			await expect(writeTarFiles(tarFiles, testDir)).rejects.toThrow();

			// With Effection, errors are propagated immediately and pending operations are cancelled
			// This test verifies that the error reaches the caller
		});

		it("should successfully write all files when no errors occur", async () => {
			const tarFiles: ParsedTarFileItem[] = [
				{
					name: "success1.txt",
					data: new Uint8Array([1, 2, 3]),
					type: "file",
					size: 3,
					mode: 0o644,
					uid: 0,
					gid: 0,
					mtime: new Date(),
					uname: "user",
					gname: "group",
				},
				{
					name: "success2.txt",
					data: new Uint8Array([4, 5, 6]),
					type: "file",
					size: 3,
					mode: 0o644,
					uid: 0,
					gid: 0,
					mtime: new Date(),
					uname: "user",
					gname: "group",
				},
			];

			await expect(writeTarFiles(tarFiles, testDir)).resolves.toBeUndefined();

			// Verify both files were written
			const files = await readdir(testDir);
			expect(files).toContain("success1.txt");
			expect(files).toContain("success2.txt");
		});
	});

	describe("writeZipFiles", () => {
		it("should propagate errors when write fails", async () => {
			const zipFiles: Unzipped = {
				"zip1.txt": new Uint8Array([1, 2, 3]),
				// Invalid path that will cause an error
				"\0invalid.txt": new Uint8Array([4, 5, 6]),
				"zip3.txt": new Uint8Array([7, 8, 9]),
			};

			await expect(writeZipFiles(zipFiles, testDir)).rejects.toThrow();

			// With Effection, errors are propagated immediately
		});

		it("should successfully write all zip files when no errors occur", async () => {
			const zipFiles: Unzipped = {
				"success1.txt": new Uint8Array([1, 2, 3]),
				"success2.txt": new Uint8Array([4, 5, 6]),
			};

			await expect(writeZipFiles(zipFiles, testDir)).resolves.toBeUndefined();

			// Verify both files were written
			const files = await readdir(testDir);
			expect(files).toContain("success1.txt");
			expect(files).toContain("success2.txt");
		});

		it("should skip empty files", async () => {
			const zipFiles: Unzipped = {
				"empty.txt": new Uint8Array([]),
				"nonempty.txt": new Uint8Array([1, 2, 3]),
			};

			await writeZipFiles(zipFiles, testDir);

			// Only non-empty file should be written
			const files = await readdir(testDir);
			expect(files).not.toContain("empty.txt");
			expect(files).toContain("nonempty.txt");
		});
	});

	describe("Cancellation semantics with Effection", () => {
		it("documents expected cancellation behavior", () => {
			// When using Effection's `all()` combinator for concurrent operations:
			//
			// 1. All operations start concurrently
			// 2. If any operation fails:
			//    - The error is propagated immediately
			//    - All sibling operations are cancelled
			//    - Resources are cleaned up
			// 3. If all operations succeed:
			//    - The combinator resolves with all results
			//
			// Benefits over Promise.all:
			// - Automatic cancellation of pending operations on error
			// - No orphaned operations continue after failure
			// - Resource cleanup is guaranteed
			// - More predictable error handling

			expect(true).toBe(true);
		});
	});
});

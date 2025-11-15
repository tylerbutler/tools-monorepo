import { mkdtempSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
	copyTurboConfigFiles,
	isTurboConfigured,
} from "../../../src/lib/fluid-repo-overlay/config-files-turbo.js";

describe("config-files-turbo", () => {
	describe("copyTurboConfigFiles", () => {
		it("copies turbo.jsonc to repo root", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-turbo-test-"));
			const mockLogger = {
				verbose: vi.fn(),
			};

			await copyTurboConfigFiles(tmpDir, mockLogger);

			// Verify file was created
			expect(await isTurboConfigured(tmpDir)).toBe(true);

			// Verify content was copied (should be valid JSON/JSONC)
			const content = await readFile(join(tmpDir, "turbo.jsonc"), "utf-8");
			expect(content.length).toBeGreaterThan(0);

			// Verify logger was called
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("Copying turbo.jsonc"),
			);
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("✅ turbo.jsonc created"),
			);
		});

		it("skips copy if turbo.jsonc already exists", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-turbo-test-"));
			const turboJsonPath = join(tmpDir, "turbo.jsonc");

			// Create existing turbo.jsonc
			await writeFile(
				turboJsonPath,
				'{"$schema": "https://turbo.build/schema.json"}',
				"utf-8",
			);

			const mockLogger = {
				verbose: vi.fn(),
			};

			await copyTurboConfigFiles(tmpDir, mockLogger);

			// Verify existing content was not overwritten
			const content = await readFile(turboJsonPath, "utf-8");
			expect(JSON.parse(content)).toEqual({
				$schema: "https://turbo.build/schema.json",
			});

			// Verify logger indicated skip
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("already exists"),
			);
		});
	});

	describe("isTurboConfigured", () => {
		it("returns true when turbo.jsonc exists", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-turbo-test-"));
			await writeFile(join(tmpDir, "turbo.jsonc"), "{}", "utf-8");

			expect(await isTurboConfigured(tmpDir)).toBe(true);
		});

		it("returns false when turbo.jsonc does not exist", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-turbo-test-"));

			expect(await isTurboConfigured(tmpDir)).toBe(false);
		});
	});
});

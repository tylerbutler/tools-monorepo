import { mkdtempSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { describe, expect, it, vi } from "vitest";
import {
	copyNxConfigFiles,
	isNxConfigured,
} from "../../../src/lib/fluid-repo-overlay/config-files.js";

describe("config-files", () => {
	describe("copyNxConfigFiles", () => {
		it("copies nx.json to repo root", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-test-"));
			const mockLogger = {
				verbose: vi.fn(),
			};

			await copyNxConfigFiles(tmpDir, mockLogger);

			// Verify file was created
			expect(await isNxConfigured(tmpDir)).toBe(true);

			// Verify content was copied (should be valid JSON)
			const content = await readFile(join(tmpDir, "nx.json"), "utf-8");
			expect(() => JSON.parse(content)).not.toThrow();

			// Verify logger was called
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("Copying nx.json"),
			);
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("✅ nx.json created"),
			);
		});

		it("skips copy if nx.json already exists", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-test-"));
			const nxJsonPath = join(tmpDir, "nx.json");

			// Create existing nx.json
			await writeFile(nxJsonPath, '{"existing": true}', "utf-8");

			const mockLogger = {
				verbose: vi.fn(),
			};

			await copyNxConfigFiles(tmpDir, mockLogger);

			// Verify existing content was not overwritten
			const content = await readFile(nxJsonPath, "utf-8");
			expect(JSON.parse(content)).toEqual({ existing: true });

			// Verify logger indicated skip
			expect(mockLogger.verbose).toHaveBeenCalledWith(
				expect.stringContaining("already exists"),
			);
		});
	});

	describe("isNxConfigured", () => {
		it("returns true when nx.json exists", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-test-"));
			await writeFile(join(tmpDir, "nx.json"), "{}", "utf-8");

			expect(await isNxConfigured(tmpDir)).toBe(true);
		});

		it("returns false when nx.json does not exist", async () => {
			const tmpDir = mkdtempSync(join(tmpdir(), "config-files-test-"));

			expect(await isNxConfigured(tmpDir)).toBe(false);
		});
	});
});

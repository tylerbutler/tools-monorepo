import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	normalizeRepoRelativeFilePath,
	resolveRepoFilePath,
} from "../../src/utils/safePaths.js";

describe("safePaths utilities", () => {
	let rootDir: string;
	let outsideDir: string;

	beforeEach(() => {
		rootDir = mkdtempSync(join(tmpdir(), "repopo-safe-paths-root-"));
		outsideDir = mkdtempSync(join(tmpdir(), "repopo-safe-paths-outside-"));
	});

	afterEach(() => {
		rmSync(rootDir, { recursive: true, force: true });
		rmSync(outsideDir, { recursive: true, force: true });
	});

	describe("resolveRepoFilePath", () => {
		it("should resolve a repository-relative path", () => {
			const filePath = "packages/repopo/package.json";
			const resolved = resolveRepoFilePath(rootDir, filePath);

			expect(resolved).toBe(join(rootDir, filePath));
		});

		it("should allow absolute paths that stay inside repository root", () => {
			const filePath = join(rootDir, "packages/repopo/package.json");
			const resolved = resolveRepoFilePath(rootDir, filePath);

			expect(resolved).toBe(filePath);
		});

		it("should reject repository traversal paths", () => {
			expect(() => resolveRepoFilePath(rootDir, "../outside.json")).toThrow(
				"within repository root",
			);
		});

		it("should reject absolute paths outside repository root", () => {
			const filePath = join(outsideDir, "outside.json");
			expect(() => resolveRepoFilePath(rootDir, filePath)).toThrow(
				"within repository root",
			);
		});
	});

	describe("normalizeRepoRelativeFilePath", () => {
		it("should convert absolute path inside root to relative path", () => {
			const absolutePath = join(rootDir, "packages/repopo/package.json");

			expect(normalizeRepoRelativeFilePath(rootDir, absolutePath)).toBe(
				"packages/repopo/package.json",
			);
		});

		it("should normalize windows-style separators to forward slashes", () => {
			expect(
				normalizeRepoRelativeFilePath(
					rootDir,
					"packages\\repopo\\package.json",
				),
			).toBe("packages/repopo/package.json");
		});

		it("should reject path resolving to repository root", () => {
			expect(() => normalizeRepoRelativeFilePath(rootDir, ".")).toThrow(
				"repository root",
			);
		});
	});
});

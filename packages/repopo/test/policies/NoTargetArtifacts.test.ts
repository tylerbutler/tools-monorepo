import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoTargetArtifacts } from "../../src/policies/NoTargetArtifacts.js";
import { runHandler } from "../test-helpers.js";

describe("NoTargetArtifacts", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = join(
			tmpdir(),
			`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("policy matching", () => {
		const matchedExtensions = [
			".rlib",
			".rmeta",
			".d",
			".so",
			".dylib",
			".dll",
			".exe",
			".pdb",
		];

		for (const ext of matchedExtensions) {
			it(`should match files with ${ext} extension`, () => {
				expect(NoTargetArtifacts.match.test(`target/debug/foo${ext}`)).toBe(
					true,
				);
			});
		}

		it("should not match .rs files", () => {
			expect(NoTargetArtifacts.match.test("src/main.rs")).toBe(false);
		});

		it("should not match .toml files", () => {
			expect(NoTargetArtifacts.match.test("Cargo.toml")).toBe(false);
		});

		it("should not match .md files", () => {
			expect(NoTargetArtifacts.match.test("README.md")).toBe(false);
		});

		it("should match case-insensitively", () => {
			expect(NoTargetArtifacts.match.test("foo.DLL")).toBe(true);
			expect(NoTargetArtifacts.match.test("foo.EXE")).toBe(true);
		});
	});

	describe("handler behavior", () => {
		it("should report failure for matched artifact files", async () => {
			const result = await runHandler(NoTargetArtifacts.handler, {
				file: "target/debug/libfoo.rlib",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "errorMessages" in result) {
				expect(result.errorMessages.join()).toContain(
					"Build artifact detected",
				);
				expect(result.autoFixable).toBe(false);
			}
		});

		it("should allow artifacts in test/ directories", async () => {
			const result = await runHandler(NoTargetArtifacts.handler, {
				file: "test/fixtures/sample.dll",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should allow artifacts in fixture directories", async () => {
			const result = await runHandler(NoTargetArtifacts.handler, {
				file: "fixture/sample.so",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});
});

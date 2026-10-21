import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoBuildDirectory } from "../../src/policies/NoBuildDirectory.js";
import { runHandler } from "../test-helpers.js";

describe("NoBuildDirectory", () => {
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
		it("should match files in build/dev directory", () => {
			expect(
				NoBuildDirectory.match.test("build/dev/gleam/my_app/ebin/my_app.app"),
			).toBe(true);
		});

		it("should match files in build/prod directory", () => {
			expect(NoBuildDirectory.match.test("build/prod/lib/my_dep.tar.gz")).toBe(
				true,
			);
		});

		it("should not match gleam.toml", () => {
			expect(NoBuildDirectory.match.test("gleam.toml")).toBe(false);
		});

		it("should not match source files containing 'build' in name", () => {
			expect(NoBuildDirectory.match.test("src/build.gleam")).toBe(false);
		});
	});

	describe("handler behavior", () => {
		it("should report failure for matched build directory files", async () => {
			const result = await runHandler(NoBuildDirectory.handler, {
				file: "build/dev/gleam/my_app/ebin/my_app.app",
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

		it("should include the file path in error messages", async () => {
			const filePath = "build/prod/lib/my_dep.tar.gz";
			const result = await runHandler(NoBuildDirectory.handler, {
				file: filePath,
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "errorMessages" in result) {
				expect(result.errorMessages.join()).toContain(filePath);
			}
		});
	});
});

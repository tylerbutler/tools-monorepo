import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamProjectStructure } from "../../src/policies/GleamProjectStructure.js";
import { runHandler } from "../test-helpers.js";

describe("GleamProjectStructure", () => {
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
		it("should match gleam.toml", () => {
			expect(GleamProjectStructure.match.test("gleam.toml")).toBe(true);
		});

		it("should match nested gleam.toml", () => {
			expect(
				GleamProjectStructure.match.test("packages/my_app/gleam.toml"),
			).toBe(true);
		});

		it("should not match other files", () => {
			expect(GleamProjectStructure.match.test("README.md")).toBe(false);
			expect(GleamProjectStructure.match.test("Cargo.toml")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when src/ directory exists", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_app"'].join("\n"),
			);
			mkdirSync(join(testDir, "src"), { recursive: true });

			const result = await runHandler(GleamProjectStructure.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when both src/ and test/ exist with requireTestDir=true", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_app"'].join("\n"),
			);
			mkdirSync(join(testDir, "src"), { recursive: true });
			mkdirSync(join(testDir, "test"), { recursive: true });

			const result = await runHandler(GleamProjectStructure.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { requireTestDir: true },
			});

			expect(result).toBe(true);
		});

		it("should skip src check when requireSrcDir=false", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_app"'].join("\n"),
			);

			const result = await runHandler(GleamProjectStructure.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { requireSrcDir: false },
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when src/ directory is missing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_app"'].join("\n"),
			);

			const result = await runHandler(GleamProjectStructure.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing src/ directory");
			}
		});

		it("should fail when test/ directory is missing and requireTestDir=true", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_app"'].join("\n"),
			);
			mkdirSync(join(testDir, "src"), { recursive: true });

			const result = await runHandler(GleamProjectStructure.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { requireTestDir: true },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing test/ directory");
			}
		});
	});
});

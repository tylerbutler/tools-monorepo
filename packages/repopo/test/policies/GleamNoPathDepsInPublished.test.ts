import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamNoPathDepsInPublished } from "../../src/policies/GleamNoPathDepsInPublished.js";
import { runHandler } from "../test-helpers.js";

describe("GleamNoPathDepsInPublished", () => {
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

	describe("pass cases", () => {
		it("should pass when there are no dependencies", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A test app"',
				].join("\n"),
			);

			const result = await runHandler(GleamNoPathDepsInPublished.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when all dependencies use versions", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A test app"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 0.34.0 and < 2.0.0"',
					'gleam_http = ">= 3.0.0 and < 4.0.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamNoPathDepsInPublished.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should skip check when onlyPublishable=true and no description", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'my_local_dep = { path = "../my_local_dep" }',
				].join("\n"),
			);

			const result = await runHandler(GleamNoPathDepsInPublished.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { onlyPublishable: true },
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when a path dependency is used", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A test app"',
					"",
					"[dependencies]",
					'my_local_dep = { path = "../my_local_dep" }',
				].join("\n"),
			);

			const result = await runHandler(GleamNoPathDepsInPublished.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("my_local_dep");
				expect(result.error).toContain("path dependency");
			}
		});

		it("should fail when onlyPublishable=true and package has description", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A publishable app"',
					"",
					"[dependencies]",
					'my_local_dep = { path = "../my_local_dep" }',
				].join("\n"),
			);

			const result = await runHandler(GleamNoPathDepsInPublished.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { onlyPublishable: true },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("my_local_dep");
				expect(result.error).toContain("path dependency");
			}
		});
	});
});

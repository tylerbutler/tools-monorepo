import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamDepVersions } from "../../src/policies/GleamDepVersions.js";
import { runHandler } from "../test-helpers.js";

describe("GleamDepVersions", () => {
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
		it("should pass when all dependencies have versions", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 0.34.0 and < 2.0.0"',
					'gleam_http = ">= 3.0.0 and < 4.0.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamDepVersions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass for path dependencies without versions", async () => {
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

			const result = await runHandler(GleamDepVersions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass with unbounded version when warnUnbounded=false (default)", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 1.0.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamDepVersions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when a dependency has no version and is not a path dep", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					"gleam_stdlib = {}",
				].join("\n"),
			);

			const result = await runHandler(GleamDepVersions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("gleam_stdlib");
				expect(result.error).toContain("no version constraint");
			}
		});

		it("should fail with unbounded version when warnUnbounded=true", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 1.0.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamDepVersions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { warnUnbounded: true },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("gleam_stdlib");
				expect(result.error).toContain("unbounded version range");
			}
		});
	});

	describe("dev-dependencies", () => {
		it("should check dev-dependencies as well", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 0.34.0 and < 2.0.0"',
					"",
					"[dev-dependencies]",
					"gleeunit = {}",
				].join("\n"),
			);

			const result = await runHandler(GleamDepVersions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("gleeunit");
				expect(result.error).toContain("dev-dependencies");
			}
		});
	});
});

import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamTomlSorted } from "../../src/policies/GleamTomlSorted.js";
import { runHandler } from "../test-helpers.js";

describe("GleamTomlSorted", () => {
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

	describe("sorted dependencies", () => {
		it("should pass when dependencies are sorted", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_http = ">= 1.0.0"',
					'gleam_json = ">= 1.0.0"',
					'gleam_stdlib = ">= 0.34.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamTomlSorted.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when no dependencies section exists", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamTomlSorted.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("unsorted dependencies", () => {
		it("should fail when dependencies are unsorted", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 0.34.0"',
					'gleam_http = ">= 1.0.0"',
					'gleam_json = ">= 1.0.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamTomlSorted.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("dependencies");
				expect(result.fixable).toBe(true);
			}
		});

		it("should fail when dev-dependencies are unsorted", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					"",
					"[dev-dependencies]",
					'gleeunit = ">= 1.0.0"',
					'birdie = ">= 1.0.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamTomlSorted.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("dev-dependencies");
			}
		});
	});

	describe("auto-fix", () => {
		it("should sort dependencies when resolve=true", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 0.34.0"',
					'gleam_http = ">= 1.0.0"',
					'gleam_json = ">= 1.0.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamTomlSorted.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: true,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.fixable).toBe(true);
				expect(result.fixed).toBe(true);
			}

			// Verify file was actually sorted
			const content = readFileSync(join(testDir, "gleam.toml"), "utf-8");
			const depsStart = content.indexOf("[dependencies]");
			const depsSection = content.slice(depsStart);
			const httpIdx = depsSection.indexOf("gleam_http");
			const jsonIdx = depsSection.indexOf("gleam_json");
			const stdlibIdx = depsSection.indexOf("gleam_stdlib");
			expect(httpIdx).toBeLessThan(jsonIdx);
			expect(jsonIdx).toBeLessThan(stdlibIdx);
		});
	});

	describe("custom sections config", () => {
		it("should only check configured sections", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'gleam_stdlib = ">= 0.34.0"',
					'gleam_http = ">= 1.0.0"',
					"",
					"[dev-dependencies]",
					'gleeunit = ">= 1.0.0"',
					'birdie = ">= 1.0.0"',
				].join("\n"),
			);

			// Only check dev-dependencies, ignoring unsorted dependencies
			const result = await runHandler(GleamTomlSorted.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { sections: ["dev-dependencies"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("dev-dependencies");
				expect(result.error).not.toContain("[dependencies]");
			}
		});
	});
});

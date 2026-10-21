import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamNameRestrictions } from "../../src/policies/GleamNameRestrictions.js";
import { runHandler } from "../test-helpers.js";

describe("GleamNameRestrictions", () => {
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
		it("should pass with a valid snake_case name", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass with a simple name", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "hello"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when no name field is present", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail with gleam_ prefix", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "gleam_my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("gleam_");
				expect(result.error).toContain("reserved prefix");
			}
		});

		it("should fail with camelCase name", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "myPackage"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("not snake_case");
			}
		});

		it("should fail with uppercase name", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "MyPackage"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("not snake_case");
			}
		});

		it("should fail with hyphenated name", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my-package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("not snake_case");
			}
		});
	});

	describe("custom deny prefixes", () => {
		it("should deny custom prefixes", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "internal_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { denyPrefixes: ["internal_"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("internal_");
			}
		});

		it("should allow gleam_ prefix when not in deny list", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "gleam_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamNameRestrictions.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { denyPrefixes: [] },
			});

			expect(result).toBe(true);
		});
	});
});

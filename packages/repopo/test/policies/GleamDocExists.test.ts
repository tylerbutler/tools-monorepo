import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamDocExists } from "../../src/policies/GleamDocExists.js";
import { runHandler } from "../test-helpers.js";

describe("GleamDocExists", () => {
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
		it("should pass when README.md exists", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A test app"',
				].join("\n"),
			);
			writeFileSync(join(testDir, "README.md"), "# My App\n");

			const result = await runHandler(GleamDocExists.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should skip check when no description and no licences", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_app"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamDocExists.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when README.md is missing and package has description", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A test app"',
				].join("\n"),
			);

			const result = await runHandler(GleamDocExists.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing required documentation");
				expect(result.error).toContain("README.md");
			}
		});
	});

	describe("custom config", () => {
		it("should check custom required files", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A test app"',
				].join("\n"),
			);
			writeFileSync(join(testDir, "CHANGELOG.md"), "# Changelog\n");

			const result = await runHandler(GleamDocExists.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { required: ["CHANGELOG.md"] },
			});

			expect(result).toBe(true);
		});

		it("should report missing recommended files", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_app"',
					'version = "1.0.0"',
					'description = "A test app"',
				].join("\n"),
			);
			writeFileSync(join(testDir, "README.md"), "# My App\n");

			const result = await runHandler(GleamDocExists.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: {
					required: ["README.md"],
					recommended: ["CONTRIBUTING.md"],
				},
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing recommended documentation");
				expect(result.error).toContain("CONTRIBUTING.md");
			}
		});
	});
});

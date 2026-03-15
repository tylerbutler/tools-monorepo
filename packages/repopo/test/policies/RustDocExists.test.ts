import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RustDocExists } from "../../src/policies/RustDocExists.js";
import { runHandler } from "../test-helpers.js";

describe("RustDocExists", () => {
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
		it("should match Cargo.toml", () => {
			expect(RustDocExists.match.test("Cargo.toml")).toBe(true);
		});

		it("should match nested Cargo.toml", () => {
			expect(RustDocExists.match.test("crates/foo/Cargo.toml")).toBe(true);
		});

		it("should not match other files", () => {
			expect(RustDocExists.match.test("README.md")).toBe(false);
			expect(RustDocExists.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when README.md exists", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);
			writeFileSync(join(testDir, "README.md"), "# My Crate\n");

			const result = await runHandler(RustDocExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should skip workspace root", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/*"]'].join("\n"),
			);

			const result = await runHandler(RustDocExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when README.md is missing", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);

			const result = await runHandler(RustDocExists.handler, {
				file: "Cargo.toml",
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

	describe("custom required/recommended files", () => {
		it("should check custom required files", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);
			writeFileSync(join(testDir, "CHANGELOG.md"), "# Changelog\n");

			const result = await runHandler(RustDocExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { required: ["CHANGELOG.md"] },
			});

			expect(result).toBe(true);
		});

		it("should report missing recommended files", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);
			writeFileSync(join(testDir, "README.md"), "# My Crate\n");

			const result = await runHandler(RustDocExists.handler, {
				file: "Cargo.toml",
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

		it("should fail when custom required file is missing", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);

			const result = await runHandler(RustDocExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { required: ["CHANGELOG.md", "README.md"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("CHANGELOG.md");
				expect(result.error).toContain("README.md");
			}
		});
	});
});

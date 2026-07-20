import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { PublicApiDocumented } from "../../src/policies/PublicApiDocumented.js";
import { runHandler } from "../test-helpers.js";

describe("PublicApiDocumented", () => {
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
			expect(PublicApiDocumented.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match other files", () => {
			expect(PublicApiDocumented.match.test("src/lib.rs")).toBe(false);
			expect(PublicApiDocumented.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when [lints.rust] missing_docs = 'warn' is present", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.rust]",
					'missing_docs = "warn"',
				].join("\n"),
			);

			const result = await runHandler(PublicApiDocumented.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when missing_docs = 'deny'", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.rust]",
					'missing_docs = "deny"',
				].join("\n"),
			);

			const result = await runHandler(PublicApiDocumented.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when missing_docs = 'forbid'", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.rust]",
					'missing_docs = "forbid"',
				].join("\n"),
			);

			const result = await runHandler(PublicApiDocumented.handler, {
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

			const result = await runHandler(PublicApiDocumented.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when [lints.rust] missing_docs is not set", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);

			const result = await runHandler(PublicApiDocumented.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("missing_docs lint is not configured");
			}
		});

		it("should fail when missing_docs is set to 'allow'", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.rust]",
					'missing_docs = "allow"',
				].join("\n"),
			);

			const result = await runHandler(PublicApiDocumented.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("missing_docs lint is not configured");
			}
		});
	});

	describe("checkCargoLints config", () => {
		it("should skip lint check when checkCargoLints is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);

			const result = await runHandler(PublicApiDocumented.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { checkCargoLints: false },
			});

			expect(result).toBe(true);
		});
	});
});

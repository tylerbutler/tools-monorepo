import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CargoLintsConfigured } from "../../src/policies/CargoLintsConfigured.js";
import { runHandler } from "../test-helpers.js";

describe("CargoLintsConfigured", () => {
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
			expect(CargoLintsConfigured.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match other files", () => {
			expect(CargoLintsConfigured.match.test("clippy.toml")).toBe(false);
			expect(CargoLintsConfigured.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when [lints.clippy] exists", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.clippy]",
					'pedantic = "warn"',
				].join("\n"),
			);

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should skip workspace-only Cargo.toml", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/*"]'].join("\n"),
			);

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when [lints] section is missing", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing [lints] section");
			}
		});

		it("should fail when [lints] exists but [lints.clippy] is missing", async () => {
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

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing [lints.clippy] section");
			}
		});
	});

	describe("required lint levels config", () => {
		it("should pass when required lints have correct levels", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.clippy]",
					'pedantic = "warn"',
					'nursery = "allow"',
				].join("\n"),
			);

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { required: { pedantic: "warn" } },
			});

			expect(result).toBe(true);
		});

		it("should fail when required lint has wrong level", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.clippy]",
					'pedantic = "allow"',
				].join("\n"),
			);

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { required: { pedantic: "warn" } },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("pedantic");
				expect(result.error).toContain('"warn"');
			}
		});

		it("should fail when required lint is missing", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[lints.clippy]",
					'nursery = "allow"',
				].join("\n"),
			);

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { required: { pedantic: "warn" } },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing clippy lint: pedantic");
			}
		});
	});

	describe("requireSection config", () => {
		it("should not require [lints] when requireSection is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);

			const result = await runHandler(CargoLintsConfigured.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { requireSection: false },
			});

			expect(result).toBe(true);
		});
	});
});

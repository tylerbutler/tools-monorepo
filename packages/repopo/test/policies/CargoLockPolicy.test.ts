import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CargoLockPolicy } from "../../src/policies/CargoLockPolicy.js";
import { runHandler } from "../test-helpers.js";

describe("CargoLockPolicy", () => {
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
			expect(CargoLockPolicy.match.test("Cargo.toml")).toBe(true);
		});

		it("should match nested Cargo.toml", () => {
			expect(CargoLockPolicy.match.test("crates/app/Cargo.toml")).toBe(true);
		});

		it("should not match other files", () => {
			expect(CargoLockPolicy.match.test("Cargo.lock")).toBe(false);
			expect(CargoLockPolicy.match.test("package.json")).toBe(false);
		});
	});

	describe("binary crate", () => {
		it("should pass when binary crate has Cargo.lock", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-app"',
					'version = "1.0.0"',
					"",
					"[[bin]]",
					'name = "my-app"',
				].join("\n"),
			);
			writeFileSync(join(testDir, "Cargo.lock"), "# lock file\n");

			const result = await runHandler(CargoLockPolicy.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should fail when binary crate has no Cargo.lock", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-app"',
					'version = "1.0.0"',
					"",
					"[[bin]]",
					'name = "my-app"',
				].join("\n"),
			);

			const result = await runHandler(CargoLockPolicy.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Binary crate is missing Cargo.lock");
			}
		});

		it("should treat package without [lib] as binary", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-app"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(CargoLockPolicy.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Binary crate is missing Cargo.lock");
			}
		});
	});

	describe("library crate", () => {
		it("should pass for library crate without Cargo.lock by default", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-lib"',
					'version = "1.0.0"',
					"",
					"[lib]",
					'name = "my_lib"',
				].join("\n"),
			);

			const result = await runHandler(CargoLockPolicy.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should warn when library crate has Cargo.lock and library policy is warn", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-lib"',
					'version = "1.0.0"',
					"",
					"[lib]",
					'name = "my_lib"',
				].join("\n"),
			);
			writeFileSync(join(testDir, "Cargo.lock"), "# lock file\n");

			const result = await runHandler(CargoLockPolicy.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { libraries: "warn" },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain(
					"Library crate has Cargo.lock committed",
				);
			}
		});
	});

	describe("workspace root", () => {
		it("should skip workspace root", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/*"]'].join("\n"),
			);

			const result = await runHandler(CargoLockPolicy.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});
});

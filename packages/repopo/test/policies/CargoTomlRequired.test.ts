import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CargoTomlRequired } from "../../src/policies/CargoTomlRequired.js";
import { runHandler } from "../test-helpers.js";

describe("CargoTomlRequired", () => {
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
		it("should match Cargo.toml at root", () => {
			expect(CargoTomlRequired.match.test("Cargo.toml")).toBe(true);
		});

		it("should match nested Cargo.toml", () => {
			expect(CargoTomlRequired.match.test("crates/my-crate/Cargo.toml")).toBe(
				true,
			);
		});

		it("should not match other files", () => {
			expect(CargoTomlRequired.match.test("README.md")).toBe(false);
			expect(CargoTomlRequired.match.test("package.json")).toBe(false);
			expect(CargoTomlRequired.match.test("Cargo.lock")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when all default required fields are present", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-crate"',
					'license = "MIT"',
					'description = "A test crate"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
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

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when required fields are missing", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"'].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("license");
				expect(result.error).toContain("description");
			}
		});

		it("should fail when [package] section is missing entirely", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[dependencies]", 'serde = "1.0"'].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing [package] section");
			}
		});
	});

	describe("custom required fields", () => {
		it("should accept custom required fields config", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { required: ["version"] },
			});

			expect(result).toBe(true);
		});

		it("should fail with custom required fields when missing", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"'].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { required: ["homepage", "repository"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("homepage");
				expect(result.error).toContain("repository");
			}
		});
	});

	describe("expectedValues config", () => {
		it("should pass when expected values match", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-crate"',
					'license = "MIT"',
					'description = "A test crate"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { expectedValues: { license: "MIT" } },
			});

			expect(result).toBe(true);
		});

		it("should fail when expected values do not match", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-crate"',
					'license = "Apache-2.0"',
					'description = "A test crate"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { expectedValues: { license: "MIT" } },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain('Expected package.license = "MIT"');
			}
		});
	});

	describe("minimumEdition config", () => {
		it("should pass when edition meets minimum", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-crate"',
					'edition = "2021"',
					'license = "MIT"',
					'description = "A test crate"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { minimumEdition: "2021" },
			});

			expect(result).toBe(true);
		});

		it("should fail when edition is below minimum", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-crate"',
					'edition = "2018"',
					'license = "MIT"',
					'description = "A test crate"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { minimumEdition: "2021" },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("below minimum");
			}
		});

		it("should fail when edition is missing but minimumEdition is set", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "my-crate"',
					'license = "MIT"',
					'description = "A test crate"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlRequired.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { minimumEdition: "2021" },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing package.edition");
			}
		});
	});
});

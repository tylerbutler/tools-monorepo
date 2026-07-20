import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CargoLicenceValidated } from "../../src/policies/CargoLicenceValidated.js";
import { runHandler } from "../test-helpers.js";

describe("CargoLicenceValidated", () => {
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
			expect(CargoLicenceValidated.match.test("Cargo.toml")).toBe(true);
		});

		it("should match nested Cargo.toml", () => {
			expect(
				CargoLicenceValidated.match.test("crates/my-crate/Cargo.toml"),
			).toBe(true);
		});

		it("should not match other files", () => {
			expect(CargoLicenceValidated.match.test("package.json")).toBe(false);
		});
	});

	describe("missing licence", () => {
		it("should fail when license field is missing", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing or empty license");
			}
		});

		it("should fail when license is empty string", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = ""'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing or empty license");
			}
		});
	});

	describe("workspace skipping", () => {
		it("should skip workspace-only Cargo.toml by default", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/*"]'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should not skip workspace when skipWorkspace is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/*"]'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { skipWorkspace: false },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing or empty license");
			}
		});
	});

	describe("valid SPDX identifiers", () => {
		it("should pass with MIT", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = "MIT"'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass with Apache-2.0", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = "Apache-2.0"'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("SPDX correction", () => {
		it("should detect wrong casing and suggest correction", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = "mit"'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain('"mit"');
				expect(result.error).toContain('"MIT"');
				expect(result.fixable).toBe(true);
			}
		});

		it("should fail for unrecognized licence", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = "FAKE-LICENSE"'].join(
					"\n",
				),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("not a recognized SPDX identifier");
			}
		});

		it("should auto-fix correctable licence when resolve is true", async () => {
			const filePath = join(testDir, "Cargo.toml");
			writeFileSync(
				filePath,
				["[package]", 'name = "my-crate"', 'license = "mit"'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: true,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.fixed).toBe(true);
			}

			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain('"MIT"');
			expect(content).not.toContain('"mit"');
		});
	});

	describe("allowlist", () => {
		it("should pass when licence is in allowed list", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = "MIT"'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { allowedLicences: ["MIT", "Apache-2.0"] },
			});

			expect(result).toBe(true);
		});

		it("should fail when licence is not in allowed list", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = "GPL-3.0-only"'].join(
					"\n",
				),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { allowedLicences: ["MIT", "Apache-2.0"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("not in the allowed list");
			}
		});
	});

	describe("validateSpdx disabled", () => {
		it("should skip SPDX validation when validateSpdx is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "my-crate"', 'license = "mit"'].join("\n"),
			);

			const result = await runHandler(CargoLicenceValidated.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { validateSpdx: false },
			});

			// With validateSpdx disabled, "mit" passes (only presence is checked)
			expect(result).toBe(true);
		});
	});
});

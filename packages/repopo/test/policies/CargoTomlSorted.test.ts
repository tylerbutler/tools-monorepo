import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { CargoTomlSorted } from "../../src/policies/CargoTomlSorted.js";
import { runHandler } from "../test-helpers.js";

describe("CargoTomlSorted", () => {
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
			expect(CargoTomlSorted.match.test("Cargo.toml")).toBe(true);
		});

		it("should match nested Cargo.toml", () => {
			expect(CargoTomlSorted.match.test("crates/foo/Cargo.toml")).toBe(true);
		});

		it("should not match other files", () => {
			expect(CargoTomlSorted.match.test("package.json")).toBe(false);
			expect(CargoTomlSorted.match.test("Cargo.lock")).toBe(false);
		});
	});

	describe("sorted dependencies", () => {
		it("should pass when dependencies are sorted", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[dependencies]",
					'anyhow = "1.0"',
					'serde = "1.0"',
					'tokio = "1.0"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlSorted.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when no dependency sections exist", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "test"'].join("\n"),
			);

			const result = await runHandler(CargoTomlSorted.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("unsorted dependencies", () => {
		it("should fail when dependencies are unsorted", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[dependencies]",
					'tokio = "1.0"',
					'anyhow = "1.0"',
					'serde = "1.0"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlSorted.handler, {
				file: "Cargo.toml",
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
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[dev-dependencies]",
					'proptest = "1.0"',
					'criterion = "0.5"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlSorted.handler, {
				file: "Cargo.toml",
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
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[dependencies]",
					'tokio = "1.0"',
					'anyhow = "1.0"',
					'serde = "1.0"',
				].join("\n"),
			);

			const result = await runHandler(CargoTomlSorted.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: true,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.fixable).toBe(true);
				expect(result.fixed).toBe(true);
			}

			// Verify file was actually sorted
			const content = readFileSync(join(testDir, "Cargo.toml"), "utf-8");
			const depsStart = content.indexOf("[dependencies]");
			const depsSection = content.slice(depsStart);
			const anyhowIdx = depsSection.indexOf("anyhow");
			const serdeIdx = depsSection.indexOf("serde");
			const tokioIdx = depsSection.indexOf("tokio");
			expect(anyhowIdx).toBeLessThan(serdeIdx);
			expect(serdeIdx).toBeLessThan(tokioIdx);
		});
	});

	describe("custom sections config", () => {
		it("should only check configured sections", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					"",
					"[dependencies]",
					'tokio = "1.0"',
					'anyhow = "1.0"',
					"",
					"[dev-dependencies]",
					'proptest = "1.0"',
					'criterion = "0.5"',
				].join("\n"),
			);

			// Only check dev-dependencies, ignoring unsorted dependencies
			const result = await runHandler(CargoTomlSorted.handler, {
				file: "Cargo.toml",
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

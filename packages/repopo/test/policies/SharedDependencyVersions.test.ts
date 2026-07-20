import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SharedDependencyVersions } from "../../src/policies/SharedDependencyVersions.js";
import { runHandler } from "../test-helpers.js";

describe("SharedDependencyVersions", () => {
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
		it("should match root Cargo.toml", () => {
			expect(SharedDependencyVersions.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match nested Cargo.toml", () => {
			expect(SharedDependencyVersions.match.test("crates/foo/Cargo.toml")).toBe(
				false,
			);
		});

		it("should not match other files", () => {
			expect(SharedDependencyVersions.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when versions match across members", async () => {
			// Workspace root
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo", "crates/bar"]'].join("\n"),
			);

			// Members with same version of serde
			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				[
					"[package]",
					'name = "bar"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when no workspace section exists", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[package]", 'name = "standalone"'].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when versions mismatch across members", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo", "crates/bar"]'].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				[
					"[package]",
					'name = "bar"',
					"",
					"[dependencies]",
					'serde = "2.0"',
				].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain('Version mismatch for "serde"');
			}
		});
	});

	describe("requireWorkspaceDeps config", () => {
		it("should pass when required deps are in workspace.dependencies", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/foo"]',
					"",
					"[workspace.dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				["[package]", 'name = "foo"'].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { requireWorkspaceDeps: ["serde"] },
			});

			expect(result).toBe(true);
		});

		it("should fail when required deps are not in workspace.dependencies", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo"]'].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				["[package]", 'name = "foo"'].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { requireWorkspaceDeps: ["serde"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain(
					'"serde" should be defined in [workspace.dependencies]',
				);
			}
		});
	});

	describe("detectMismatches config", () => {
		it("should not detect mismatches when detectMismatches is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo", "crates/bar"]'].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				[
					"[package]",
					'name = "bar"',
					"",
					"[dependencies]",
					'serde = "2.0"',
				].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { detectMismatches: false },
			});

			expect(result).toBe(true);
		});
	});
});

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkspaceInheritance } from "../../src/policies/WorkspaceInheritance.js";
import { runHandler } from "../test-helpers.js";

describe("WorkspaceInheritance", () => {
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
			expect(WorkspaceInheritance.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match nested Cargo.toml", () => {
			expect(WorkspaceInheritance.match.test("crates/foo/Cargo.toml")).toBe(
				false,
			);
		});

		it("should not match other files", () => {
			expect(WorkspaceInheritance.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when members use workspace inheritance", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/foo"]',
					"",
					"[workspace.package]",
					'version = "1.0.0"',
					'authors = ["Test"]',
					'license = "MIT"',
				].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"version.workspace = true",
					"authors.workspace = true",
					"license.workspace = true",
				].join("\n"),
			);

			const result = await runHandler(WorkspaceInheritance.handler, {
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

			const result = await runHandler(WorkspaceInheritance.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when workspace.package has no inherit fields", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/foo"]',
					"",
					"[workspace.package]",
					'description = "Workspace description"',
				].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				["[package]", 'name = "foo"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(WorkspaceInheritance.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when members define fields locally instead of inheriting", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/foo"]',
					"",
					"[workspace.package]",
					'version = "1.0.0"',
					'license = "MIT"',
				].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					'version = "2.0.0"',
					'license = "Apache-2.0"',
				].join("\n"),
			);

			const result = await runHandler(WorkspaceInheritance.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("should use workspace inheritance");
				expect(result.error).toContain("version");
				expect(result.error).toContain("license");
			}
		});
	});

	describe("allowOverrides config", () => {
		it("should allow overrides for specified crate paths", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/foo", "crates/bar"]',
					"",
					"[workspace.package]",
					'version = "1.0.0"',
					'license = "MIT"',
				].join("\n"),
			);

			// foo overrides but is allowed
			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					'version = "2.0.0"',
					'license = "Apache-2.0"',
				].join("\n"),
			);

			// bar uses inheritance
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				[
					"[package]",
					'name = "bar"',
					"version.workspace = true",
					"license.workspace = true",
				].join("\n"),
			);

			const result = await runHandler(WorkspaceInheritance.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { allowOverrides: ["crates/foo"] },
			});

			expect(result).toBe(true);
		});

		it("should support wildcard patterns in allowOverrides", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/special-foo", "crates/special-bar"]',
					"",
					"[workspace.package]",
					'version = "1.0.0"',
				].join("\n"),
			);

			mkdirSync(join(testDir, "crates/special-foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/special-foo/Cargo.toml"),
				["[package]", 'name = "special-foo"', 'version = "2.0.0"'].join("\n"),
			);

			mkdirSync(join(testDir, "crates/special-bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/special-bar/Cargo.toml"),
				["[package]", 'name = "special-bar"', 'version = "3.0.0"'].join("\n"),
			);

			const result = await runHandler(WorkspaceInheritance.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { allowOverrides: ["crates/special-*"] },
			});

			expect(result).toBe(true);
		});
	});

	describe("custom inherit fields", () => {
		it("should check custom inherit fields", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/foo"]',
					"",
					"[workspace.package]",
					'version = "1.0.0"',
					'edition = "2021"',
				].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"version.workspace = true",
					'edition = "2018"',
				].join("\n"),
			);

			const result = await runHandler(WorkspaceInheritance.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { inherit: ["version", "edition"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("edition");
				expect(result.error).toContain("should use workspace inheritance");
			}
		});
	});
});

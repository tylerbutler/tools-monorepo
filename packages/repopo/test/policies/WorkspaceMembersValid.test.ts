import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { WorkspaceMembersValid } from "../../src/policies/WorkspaceMembersValid.js";
import { runHandler } from "../test-helpers.js";

describe("WorkspaceMembersValid", () => {
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
		it("should match root Cargo.toml only", () => {
			expect(WorkspaceMembersValid.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match nested Cargo.toml", () => {
			expect(WorkspaceMembersValid.match.test("crates/foo/Cargo.toml")).toBe(
				false,
			);
		});

		it("should not match other files", () => {
			expect(WorkspaceMembersValid.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass with valid member paths", async () => {
			// Create workspace root
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo", "crates/bar"]'].join("\n"),
			);

			// Create member directories with Cargo.toml
			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				["[package]", 'name = "foo"'].join("\n"),
			);
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				["[package]", 'name = "bar"'].join("\n"),
			);

			const result = await runHandler(WorkspaceMembersValid.handler, {
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

			const result = await runHandler(WorkspaceMembersValid.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when workspace has no members", async () => {
			writeFileSync(join(testDir, "Cargo.toml"), ["[workspace]"].join("\n"));

			const result = await runHandler(WorkspaceMembersValid.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when member path does not exist", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/nonexistent"]'].join("\n"),
			);

			const result = await runHandler(WorkspaceMembersValid.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("does not exist");
				expect(result.error).toContain("nonexistent");
			}
		});

		it("should fail when member directory exists but has no Cargo.toml", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/empty"]'].join("\n"),
			);
			mkdirSync(join(testDir, "crates/empty"), { recursive: true });

			const result = await runHandler(WorkspaceMembersValid.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("has no Cargo.toml");
			}
		});
	});

	describe("glob members", () => {
		it("should validate glob member patterns", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/*"]'].join("\n"),
			);

			// Create a valid member
			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				["[package]", 'name = "foo"'].join("\n"),
			);

			const result = await runHandler(WorkspaceMembersValid.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should fail when glob matches no directories with Cargo.toml", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["nonexistent/*"]'].join("\n"),
			);

			const result = await runHandler(WorkspaceMembersValid.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("matches no directories");
			}
		});
	});

	describe("validatePaths config", () => {
		it("should skip path validation when validatePaths is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/nonexistent"]'].join("\n"),
			);

			const result = await runHandler(WorkspaceMembersValid.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { validatePaths: false },
			});

			expect(result).toBe(true);
		});
	});
});

import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RustToolchainExists } from "../../src/policies/RustToolchainExists.js";
import { runHandler } from "../test-helpers.js";

describe("RustToolchainExists", () => {
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
			expect(RustToolchainExists.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match nested Cargo.toml", () => {
			// This policy matches ^Cargo\.toml$ — root only
			expect(RustToolchainExists.match.test("crates/foo/Cargo.toml")).toBe(
				false,
			);
		});

		it("should not match other files", () => {
			expect(RustToolchainExists.match.test("package.json")).toBe(false);
			expect(RustToolchainExists.match.test("rust-toolchain.toml")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when rust-toolchain.toml exists", async () => {
			writeFileSync(
				join(testDir, "rust-toolchain.toml"),
				["[toolchain]", 'channel = "stable"'].join("\n"),
			);

			const result = await runHandler(RustToolchainExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when rust-toolchain exists (without .toml)", async () => {
			writeFileSync(join(testDir, "rust-toolchain"), "stable\n");

			const result = await runHandler(RustToolchainExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when no rust-toolchain file exists", async () => {
			const result = await runHandler(RustToolchainExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("No rust-toolchain file found");
			}
		});
	});

	describe("custom config", () => {
		it("should accept custom accepted names", async () => {
			writeFileSync(join(testDir, "my-toolchain"), "nightly\n");

			const result = await runHandler(RustToolchainExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { acceptedNames: ["my-toolchain"] },
			});

			expect(result).toBe(true);
		});
	});
});

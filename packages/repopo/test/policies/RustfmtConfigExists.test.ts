import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RustfmtConfigExists } from "../../src/policies/RustfmtConfigExists.js";
import { runHandler } from "../test-helpers.js";

describe("RustfmtConfigExists", () => {
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
			expect(RustfmtConfigExists.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match other files", () => {
			expect(RustfmtConfigExists.match.test("rustfmt.toml")).toBe(false);
			expect(RustfmtConfigExists.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when rustfmt.toml exists", async () => {
			writeFileSync(join(testDir, "rustfmt.toml"), "max_width = 100\n");

			const result = await runHandler(RustfmtConfigExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});
			expect(result).toEqual([]);
		});

		it("should pass when .rustfmt.toml exists", async () => {
			writeFileSync(join(testDir, ".rustfmt.toml"), "max_width = 100\n");

			const result = await runHandler(RustfmtConfigExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});
			expect(result).toEqual([]);
		});
	});

	describe("fail cases", () => {
		it("should fail when no rustfmt config exists", async () => {
			const result = await runHandler(RustfmtConfigExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});
			expect(result).not.toEqual([]);
			if (typeof result === "object" && result.length > 0) {
				expect(result.map((finding) => finding.message).join("; ")).toContain(
					"No rustfmt config found",
				);
			}
		});
	});

	describe("custom config", () => {
		it("should accept custom accepted names", async () => {
			writeFileSync(join(testDir, "format.toml"), "max_width = 100\n");

			const result = await runHandler(RustfmtConfigExists.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { acceptedNames: ["format.toml"] },
			});
			expect(result).toEqual([]);
		});
	});
});

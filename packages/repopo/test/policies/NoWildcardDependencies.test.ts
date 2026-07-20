import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { NoWildcardDependencies } from "../../src/policies/NoWildcardDependencies.js";
import { runHandler } from "../test-helpers.js";

describe("NoWildcardDependencies", () => {
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
			expect(NoWildcardDependencies.match.test("Cargo.toml")).toBe(true);
		});

		it("should not match other files", () => {
			expect(NoWildcardDependencies.match.test("package.json")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass with normal version strings", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'serde = "1.0"',
					'tokio = "^1.0"',
					'anyhow = "~1.0"',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass with table-style dependency versions", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'serde = { version = "1.0", features = ["derive"] }',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should skip workspace root", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/*"]',
					"",
					"[workspace.dependencies]",
					'serde = "*"',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail with wildcard '*'", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'serde = "*"',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("serde");
				expect(result.error).toContain("denied version pattern");
			}
		});
	});

	describe("warn cases", () => {
		it("should warn with '>=' prefix", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					'version = "1.0.0"',
					"",
					"[dependencies]",
					'serde = ">=1.0"',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("overly permissive version range");
			}
		});

		it("should allow '>=' in dev-dependencies by default", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					'version = "1.0.0"',
					"",
					"[dev-dependencies]",
					'criterion = ">=0.5"',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should flag '>=' in dev-dependencies when allowDev is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					'version = "1.0.0"',
					"",
					"[dev-dependencies]",
					'criterion = ">=0.5"',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
				config: { allowDev: false },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("overly permissive");
			}
		});
	});

	describe("build-dependencies", () => {
		it("should check build-dependencies for wildcards", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[package]",
					'name = "test"',
					'version = "1.0.0"',
					"",
					"[build-dependencies]",
					'cc = "*"',
				].join("\n"),
			);

			const result = await runHandler(NoWildcardDependencies.handler, {
				file: "Cargo.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("cc");
				expect(result.error).toContain("denied version pattern");
			}
		});
	});
});

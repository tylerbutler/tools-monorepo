import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamVersionConstraint } from "../../src/policies/GleamVersionConstraint.js";
import { runHandler } from "../test-helpers.js";

describe("GleamVersionConstraint", () => {
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

	describe("pass cases", () => {
		it("should pass when gleam version constraint exists", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ">= 1.0.0"'].join(
					"\n",
				),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass when version meets minimum", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ">= 1.2.0"'].join(
					"\n",
				),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { minimumVersion: "1.0.0" },
			});

			expect(result).toBe(true);
		});

		it("should pass when version equals minimum exactly", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ">= 1.5.0"'].join(
					"\n",
				),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { minimumVersion: "1.5.0" },
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when gleam field is missing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing gleam version constraint");
			}
		});

		it("should fail when gleam field is empty", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ""'].join("\n"),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("Missing gleam version constraint");
			}
		});

		it("should fail when version is below minimum", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					'gleam = ">= 0.33.0"',
				].join("\n"),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { minimumVersion: "1.0.0" },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("below minimum");
			}
		});

		it("should fail when patch version is below minimum", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ">= 1.2.0"'].join(
					"\n",
				),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { minimumVersion: "1.2.1" },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("below minimum");
			}
		});
	});

	describe("semver comparisons", () => {
		it("should pass when major version is higher than minimum", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ">= 2.0.0"'].join(
					"\n",
				),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { minimumVersion: "1.5.0" },
			});

			expect(result).toBe(true);
		});

		it("should pass when minor version is higher than minimum", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ">= 1.3.0"'].join(
					"\n",
				),
			);

			const result = await runHandler(GleamVersionConstraint.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { minimumVersion: "1.2.5" },
			});

			expect(result).toBe(true);
		});
	});
});

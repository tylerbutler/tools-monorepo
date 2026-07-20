import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamTomlRequired } from "../../src/policies/GleamTomlRequired.js";
import { runHandler } from "../test-helpers.js";

describe("GleamTomlRequired", () => {
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
		it("should match gleam.toml at root", () => {
			expect(GleamTomlRequired.match.test("gleam.toml")).toBe(true);
		});

		it("should match nested gleam.toml", () => {
			expect(GleamTomlRequired.match.test("packages/my_app/gleam.toml")).toBe(
				true,
			);
		});

		it("should not match other files", () => {
			expect(GleamTomlRequired.match.test("README.md")).toBe(false);
			expect(GleamTomlRequired.match.test("package.json")).toBe(false);
			expect(GleamTomlRequired.match.test("manifest.toml")).toBe(false);
		});
	});

	describe("pass cases", () => {
		it("should pass when all default required fields are present", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});

		it("should pass with gleam version when requireGleamVersion is true", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"', 'gleam = ">= 1.0.0"'].join(
					"\n",
				),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { requireGleamVersion: true },
			});

			expect(result).toBe(true);
		});

		it("should pass with repository when requireRepository is true", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					"",
					"[repository]",
					'type = "github"',
					'user = "user"',
					'repo = "repo"',
				].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { requireRepository: true },
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("should fail when name is missing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("name");
			}
		});

		it("should fail when version is missing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"'].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("version");
			}
		});

		it("should fail when name is empty", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = ""', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("name");
			}
		});

		it("should fail when requireGleamVersion is true but gleam field is missing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { requireGleamVersion: true },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("gleam version constraint");
			}
		});

		it("should fail when requireRepository is true but repository is missing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { requireRepository: true },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("repository");
			}
		});
	});

	describe("custom required fields", () => {
		it("should accept custom required fields config", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				[
					'name = "my_package"',
					'version = "1.0.0"',
					'description = "A test package"',
				].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { required: ["description"] },
			});

			expect(result).toBe(true);
		});

		it("should fail with custom required fields when missing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				['name = "my_package"', 'version = "1.0.0"'].join("\n"),
			);

			const result = await runHandler(GleamTomlRequired.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { required: ["description", "licences"] },
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "error" in result) {
				expect(result.error).toContain("description");
				expect(result.error).toContain("licences");
			}
		});
	});
});

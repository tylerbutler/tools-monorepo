import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamInternalModulesConfigured } from "../../src/policies/GleamInternalModulesConfigured.js";
import { runHandler } from "../test-helpers.js";

describe("GleamInternalModulesConfigured", () => {
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

	it("should pass when internal_modules is set", async () => {
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "my_app"\ninternal_modules = ["my_app/internal", "my_app/internal/*"]\n',
		);

		const result = await runHandler(GleamInternalModulesConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});

		expect(result).toBe(true);
	});

	it("should fail when internal_modules field is missing", async () => {
		writeFileSync(join(testDir, "gleam.toml"), 'name = "my_app"\n');

		const result = await runHandler(GleamInternalModulesConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("Missing internal_modules");
		}
	});

	it("should suggest patterns when suggestPatterns is true and name exists", async () => {
		writeFileSync(join(testDir, "gleam.toml"), 'name = "my_app"\n');

		const result = await runHandler(GleamInternalModulesConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: { suggestPatterns: true },
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "manualFix" in result) {
			expect(result.manualFix).toContain("my_app/internal");
		}
	});

	it("should give generic message when suggestPatterns is false", async () => {
		writeFileSync(join(testDir, "gleam.toml"), 'name = "my_app"\n');

		const result = await runHandler(GleamInternalModulesConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: { suggestPatterns: false },
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "manualFix" in result) {
			expect(result.manualFix).not.toContain("my_app/internal");
			expect(result.manualFix).toContain("Add an internal_modules field");
		}
	});
});

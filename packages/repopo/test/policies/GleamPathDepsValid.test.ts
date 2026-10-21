import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamPathDepsValid } from "../../src/policies/GleamPathDepsValid.js";
import { runHandler } from "../test-helpers.js";

describe("GleamPathDepsValid", () => {
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

	it("should pass when path dep points to directory with gleam.toml", async () => {
		mkdirSync(join(testDir, "my_dep"), { recursive: true });
		writeFileSync(join(testDir, "my_dep", "gleam.toml"), 'name = "my_dep"\n');
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\n\n[dependencies]\nmy_dep = { path = "./my_dep" }\n',
		);

		const result = await runHandler(GleamPathDepsValid.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});

		expect(result).toBe(true);
	});

	it("should fail when path dep points to non-existent directory", async () => {
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\n\n[dependencies]\nmy_dep = { path = "./missing" }\n',
		);

		const result = await runHandler(GleamPathDepsValid.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("does not exist");
		}
	});

	it("should fail when path dep points to directory without gleam.toml", async () => {
		mkdirSync(join(testDir, "no_gleam"), { recursive: true });
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\n\n[dependencies]\nmy_dep = { path = "./no_gleam" }\n',
		);

		const result = await runHandler(GleamPathDepsValid.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("has no gleam.toml");
		}
	});

	it("should pass when there are no path deps", async () => {
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\n\n[dependencies]\ngleam_stdlib = ">= 0.34.0"\n',
		);

		const result = await runHandler(GleamPathDepsValid.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});

		expect(result).toBe(true);
	});

	it("should validate path deps in dev-dependencies", async () => {
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\n\n[dev-dependencies]\ntest_dep = { path = "./missing_dev" }\n',
		);

		const result = await runHandler(GleamPathDepsValid.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("dev-dependencies");
			expect(result.error).toContain("does not exist");
		}
	});
});

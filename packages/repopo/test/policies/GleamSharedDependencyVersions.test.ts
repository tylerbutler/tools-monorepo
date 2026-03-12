import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamSharedDependencyVersions } from "../../src/policies/GleamSharedDependencyVersions.js";
import { runHandler } from "../test-helpers.js";

describe("GleamSharedDependencyVersions", () => {
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

	it("should pass when less than 2 packages are configured", async () => {
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');

		const result = await runHandler(GleamSharedDependencyVersions.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["gleam.toml"],
			},
		});

		expect(result).toBe(true);
	});

	it("should pass when same versions across packages", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\n\n[dependencies]\ngleam_stdlib = ">= 0.34.0 and < 2.0.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\n\n[dependencies]\ngleam_stdlib = ">= 0.34.0 and < 2.0.0"\n',
		);

		const result = await runHandler(GleamSharedDependencyVersions.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
			},
		});

		expect(result).toBe(true);
	});

	it("should fail when different versions for same dep", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\n\n[dependencies]\ngleam_stdlib = ">= 0.34.0 and < 2.0.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\n\n[dependencies]\ngleam_stdlib = ">= 0.35.0 and < 2.0.0"\n',
		);

		const result = await runHandler(GleamSharedDependencyVersions.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
			},
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("Version mismatch");
			expect(result.error).toContain("gleam_stdlib");
		}
	});

	it("should skip check when detectMismatches is false", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\n\n[dependencies]\ngleam_stdlib = ">= 0.34.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\n\n[dependencies]\ngleam_stdlib = ">= 0.99.0"\n',
		);

		const result = await runHandler(GleamSharedDependencyVersions.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
				detectMismatches: false,
			},
		});

		expect(result).toBe(true);
	});

	it("should include dev-dependencies when includeDev is true", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\n\n[dev-dependencies]\ngleeunit = ">= 1.0.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\n\n[dev-dependencies]\ngleeunit = ">= 2.0.0"\n',
		);

		const result = await runHandler(GleamSharedDependencyVersions.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
				includeDev: true,
			},
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("Version mismatch");
			expect(result.error).toContain("gleeunit");
		}
	});
});

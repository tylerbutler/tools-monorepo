import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamMonorepoConsistency } from "../../src/policies/GleamMonorepoConsistency.js";
import { runHandler } from "../test-helpers.js";

describe("GleamMonorepoConsistency", () => {
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

		const result = await runHandler(GleamMonorepoConsistency.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["gleam.toml"],
			},
		});

		expect(result).toBe(true);
	});

	it("should pass when all packages have same licences and gleam version", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\nlicences = ["MIT"]\ngleam = ">= 1.0.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\nlicences = ["MIT"]\ngleam = ">= 1.0.0"\n',
		);

		const result = await runHandler(GleamMonorepoConsistency.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
			},
		});

		expect(result).toBe(true);
	});

	it("should fail when licences differ across packages", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\nlicences = ["MIT"]\ngleam = ">= 1.0.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\nlicences = ["Apache-2.0"]\ngleam = ">= 1.0.0"\n',
		);

		const result = await runHandler(GleamMonorepoConsistency.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
			},
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("Inconsistent");
			expect(result.error).toContain("licences");
		}
	});

	it("should fail when gleam versions differ and syncGleamVersion is true", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\nlicences = ["MIT"]\ngleam = ">= 1.0.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\nlicences = ["MIT"]\ngleam = ">= 2.0.0"\n',
		);

		const result = await runHandler(GleamMonorepoConsistency.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
				syncGleamVersion: true,
			},
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("Inconsistent");
			expect(result.error).toContain("gleam");
		}
	});

	it("should pass when gleam versions differ and syncGleamVersion is false", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\nlicences = ["MIT"]\ngleam = ">= 1.0.0"\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\nlicences = ["MIT"]\ngleam = ">= 2.0.0"\n',
		);

		const result = await runHandler(GleamMonorepoConsistency.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
				syncGleamVersion: false,
			},
		});

		expect(result).toBe(true);
	});

	it("should support custom syncFields", async () => {
		mkdirSync(join(testDir, "pkg_a"), { recursive: true });
		mkdirSync(join(testDir, "pkg_b"), { recursive: true });
		writeFileSync(join(testDir, "gleam.toml"), 'name = "root"\n');
		writeFileSync(
			join(testDir, "pkg_a", "gleam.toml"),
			'name = "a"\ndescription = "Package A"\nlicences = ["MIT"]\n',
		);
		writeFileSync(
			join(testDir, "pkg_b", "gleam.toml"),
			'name = "b"\ndescription = "Package B"\nlicences = ["MIT"]\n',
		);

		const result = await runHandler(GleamMonorepoConsistency.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: {
				packages: ["pkg_a/gleam.toml", "pkg_b/gleam.toml"],
				syncFields: ["description"],
				syncGleamVersion: false,
			},
		});

		expect(result).not.toBe(true);
		if (typeof result === "object" && "error" in result) {
			expect(result.error).toContain("Inconsistent");
			expect(result.error).toContain("description");
		}
	});
});

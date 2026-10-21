import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SharedDependencyVersions } from "../../src/policies/SharedDependencyVersions.js";
import { runHandler } from "../test-helpers.js";

describe("SharedDependencyVersions", () => {
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
		it("passes without reading Cargo.toml when it is absent or excluded from the inventory", async () => {
			expect(
				await runHandler(SharedDependencyVersions.handler, {
					root: testDir,
					files: [],
					resolve: false,
				}),
			).toBe(true);
		});

		it("should pass when versions match across members", async () => {
			// Workspace root
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo", "crates/bar"]'].join("\n"),
			);

			// Members with same version of serde
			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				[
					"[package]",
					'name = "bar"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				files: ["Cargo.toml", "crates/foo/Cargo.toml", "crates/bar/Cargo.toml"],
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

			const result = await runHandler(SharedDependencyVersions.handler, {
				files: ["Cargo.toml"],
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("fail cases", () => {
		it("reports separate findings and compares only eligible workspace manifests", async () => {
			await writeFile(
				join(testDir, "Cargo.toml"),
				'[workspace]\nmembers = ["crates/*"]\n',
			);
			for (const [name, version] of [
				["foo", "1.0"],
				["bar", "2.0"],
			] as const) {
				await mkdir(join(testDir, "crates", name), { recursive: true });
				await writeFile(
					join(testDir, "crates", name, "Cargo.toml"),
					`[dependencies]\nserde = "${version}"\ntokio = "${version}"\n`,
				);
			}
			const args = {
				root: testDir,
				files: ["Cargo.toml", "crates/foo/Cargo.toml", "crates/bar/Cargo.toml"],
				resolve: false,
				config: { requireWorkspaceDeps: ["serde"] },
			};
			const result = await runHandler(SharedDependencyVersions.handler, args);
			expect(result).toHaveLength(3);
			expect(result).toEqual(
				expect.arrayContaining([
					expect.objectContaining({ files: ["Cargo.toml"] }),
					expect.objectContaining({
						error: expect.stringContaining('Version mismatch for "serde"'),
						files: expect.arrayContaining([
							"crates/foo/Cargo.toml",
							"crates/bar/Cargo.toml",
						]),
					}),
					expect.objectContaining({
						error: expect.stringContaining('Version mismatch for "tokio"'),
					}),
				]),
			);
			expect(
				await runHandler(SharedDependencyVersions.handler, {
					...args,
					files: ["Cargo.toml", "crates/foo/Cargo.toml"],
				}),
			).toEqual([expect.objectContaining({ files: ["Cargo.toml"] })]);
		});

		it.each([
			false,
			true,
		])("should check globbed members while honoring workspace exclusions: %s", async (excludeBar) => {
			await writeFile(
				join(testDir, "Cargo.toml"),
				`[workspace]\nmembers = ["crates/*"]\n${
					excludeBar ? 'exclude = ["crates/bar"]\n' : ""
				}`,
			);
			for (const [name, version] of [
				["foo", "1.0"],
				["bar", "2.0"],
			] as const) {
				await mkdir(join(testDir, "crates", name), { recursive: true });
				await writeFile(
					join(testDir, "crates", name, "Cargo.toml"),
					`[package]\nname = "${name}"\n[dependencies]\nserde = "${version}"\n`,
				);
			}

			const result = await runHandler(SharedDependencyVersions.handler, {
				files: ["Cargo.toml", "crates/foo/Cargo.toml", "crates/bar/Cargo.toml"],
				root: testDir,
				resolve: false,
			});

			if (excludeBar) {
				expect(result).toBe(true);
			} else {
				expect(result).toMatchObject([
					{
						error: expect.stringContaining('Version mismatch for "serde"'),
						files: expect.arrayContaining([
							"crates/foo/Cargo.toml",
							"crates/bar/Cargo.toml",
						]),
					},
				]);
			}
		});

		it("should fail when versions mismatch across members", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo", "crates/bar"]'].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				[
					"[package]",
					'name = "bar"',
					"",
					"[dependencies]",
					'serde = "2.0"',
				].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				files: ["Cargo.toml", "crates/foo/Cargo.toml", "crates/bar/Cargo.toml"],
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			expect(result).toEqual([
				expect.objectContaining({
					error: expect.stringContaining('Version mismatch for "serde"'),
				}),
			]);
		});
	});

	describe("requireWorkspaceDeps config", () => {
		it("should pass when required deps are in workspace.dependencies", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				[
					"[workspace]",
					'members = ["crates/foo"]',
					"",
					"[workspace.dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				["[package]", 'name = "foo"'].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				files: ["Cargo.toml", "crates/foo/Cargo.toml"],
				root: testDir,
				resolve: false,
				config: { requireWorkspaceDeps: ["serde"] },
			});

			expect(result).toBe(true);
		});

		it("should fail when required deps are not in workspace.dependencies", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo"]'].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				["[package]", 'name = "foo"'].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				files: ["Cargo.toml", "crates/foo/Cargo.toml"],
				root: testDir,
				resolve: false,
				config: { requireWorkspaceDeps: ["serde"] },
			});

			expect(result).not.toBe(true);
			expect(result).toEqual([
				expect.objectContaining({
					error: expect.stringContaining(
						'"serde" should be defined in [workspace.dependencies]',
					),
					files: ["Cargo.toml"],
				}),
			]);
		});
	});

	describe("detectMismatches config", () => {
		it("should not detect mismatches when detectMismatches is false", async () => {
			writeFileSync(
				join(testDir, "Cargo.toml"),
				["[workspace]", 'members = ["crates/foo", "crates/bar"]'].join("\n"),
			);

			mkdirSync(join(testDir, "crates/foo"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/foo/Cargo.toml"),
				[
					"[package]",
					'name = "foo"',
					"",
					"[dependencies]",
					'serde = "1.0"',
				].join("\n"),
			);
			mkdirSync(join(testDir, "crates/bar"), { recursive: true });
			writeFileSync(
				join(testDir, "crates/bar/Cargo.toml"),
				[
					"[package]",
					'name = "bar"',
					"",
					"[dependencies]",
					'serde = "2.0"',
				].join("\n"),
			);

			const result = await runHandler(SharedDependencyVersions.handler, {
				files: ["Cargo.toml", "crates/foo/Cargo.toml", "crates/bar/Cargo.toml"],
				root: testDir,
				resolve: false,
				config: { detectMismatches: false },
			});

			expect(result).toBe(true);
		});
	});
});

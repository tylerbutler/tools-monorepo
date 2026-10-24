import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { GleamLicenceConfigured } from "../../src/policies/GleamLicenceConfigured.js";
import { runHandler } from "../test-helpers.js";

describe("GleamLicenceConfigured", () => {
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

	it("should pass with valid licence", async () => {
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\nlicences = ["MIT"]\n',
		);

		const result = await runHandler(GleamLicenceConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});
		expect(result).toEqual([]);
	});

	it("should fail when licences field is missing", async () => {
		writeFileSync(join(testDir, "gleam.toml"), 'name = "app"\n');

		const result = await runHandler(GleamLicenceConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});
		expect(result).not.toEqual([]);
		if (typeof result === "object" && result.length > 0) {
			expect(result.map((finding) => finding.message).join("; ")).toContain(
				"Missing or empty licences",
			);
		}
	});

	it("should fail when licences array is empty", async () => {
		writeFileSync(join(testDir, "gleam.toml"), 'name = "app"\nlicences = []\n');

		const result = await runHandler(GleamLicenceConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
		});
		expect(result).not.toEqual([]);
		if (typeof result === "object" && result.length > 0) {
			expect(result.map((finding) => finding.message).join("; ")).toContain(
				"Missing or empty licences",
			);
		}
	});

	it("should fail when licence is not in allowedLicences list", async () => {
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\nlicences = ["GPL-3.0-only"]\n',
		);

		const result = await runHandler(GleamLicenceConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: { allowedLicences: ["MIT", "Apache-2.0"] },
		});
		expect(result).not.toEqual([]);
		if (typeof result === "object" && result.length > 0) {
			expect(result.map((finding) => finding.message).join("; ")).toContain(
				"not in the allowed list",
			);
		}
	});

	it("should pass when licence is in allowedLicences list", async () => {
		writeFileSync(
			join(testDir, "gleam.toml"),
			'name = "app"\nlicences = ["MIT"]\n',
		);

		const result = await runHandler(GleamLicenceConfigured.handler, {
			file: "gleam.toml",
			root: testDir,
			resolve: false,
			config: { allowedLicences: ["MIT", "Apache-2.0"] },
		});
		expect(result).toEqual([]);
	});

	describe("validateSpdx (spdx-correct)", () => {
		it("keeps unrecognized licences unresolved while preserving successful corrections", async () => {
			const filePath = join(testDir, "gleam.toml");
			writeFileSync(
				filePath,
				'name = "app"\nlicences = ["mit", "TOTALLY-FAKE-LICENSE"]\n',
			);
			const result = await runHandler(GleamLicenceConfigured.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: true,
				config: { validateSpdx: true },
			});
			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				message: 'Licence "mit" should be "MIT"',
				fixStatus: "fixed",
			});
			expect(result[1]?.message).toContain("not a recognized SPDX identifier");
			expect(result[1]?.fixStatus).toBeUndefined();
			expect(readFileSync(filePath, "utf8")).toContain(
				'["MIT", "TOTALLY-FAKE-LICENSE"]',
			);
		});

		it("should pass with a valid SPDX identifier", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				'name = "app"\nlicences = ["Apache-2.0"]\n',
			);

			const result = await runHandler(GleamLicenceConfigured.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { validateSpdx: true },
			});
			expect(result).toEqual([]);
		});

		it("should detect a typo and suggest correction", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				'name = "app"\nlicences = ["mit"]\n',
			);

			const result = await runHandler(GleamLicenceConfigured.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { validateSpdx: true },
			});
			expect(result).not.toEqual([]);
			if (typeof result === "object" && result.length > 0) {
				expect(result.map((finding) => finding.message).join("; ")).toContain(
					'"mit"',
				);
				expect(result.map((finding) => finding.message).join("; ")).toContain(
					'"MIT"',
				);
				expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
					true,
				);
			}
		});

		it("should fail for unrecognized licence with no correction", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				'name = "app"\nlicences = ["TOTALLY-FAKE-LICENSE"]\n',
			);

			const result = await runHandler(GleamLicenceConfigured.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
				config: { validateSpdx: true },
			});
			expect(result).not.toEqual([]);
			if (typeof result === "object" && result.length > 0) {
				expect(result.map((finding) => finding.message).join("; ")).toContain(
					"not a recognized SPDX identifier",
				);
			}
		});

		it("should auto-fix correctable licences when resolve is true", async () => {
			const filePath = join(testDir, "gleam.toml");
			writeFileSync(filePath, 'name = "app"\nlicences = ["mit"]\n');

			const result = await runHandler(GleamLicenceConfigured.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: true,
				config: { validateSpdx: true },
			});
			expect(result).not.toEqual([]);
			if (typeof result === "object" && result.length > 0) {
				expect(
					result.length > 0 &&
						result.every((finding) => finding.fixStatus === "fixed"),
				).toBe(true);
			}

			const content = readFileSync(filePath, "utf-8");
			expect(content).toContain('"MIT"');
			expect(content).not.toContain('"mit"');
		});

		it("should pass without validateSpdx even with bad casing", async () => {
			writeFileSync(
				join(testDir, "gleam.toml"),
				'name = "app"\nlicences = ["mit"]\n',
			);

			const result = await runHandler(GleamLicenceConfigured.handler, {
				file: "gleam.toml",
				root: testDir,
				resolve: false,
			});

			// Without validateSpdx, "mit" passes (no validation beyond existence)
			expect(result).toEqual([]);
		});
	});
});

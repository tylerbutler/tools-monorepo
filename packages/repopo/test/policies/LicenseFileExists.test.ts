import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { LicenseFileExists } from "../../src/policies/LicenseFileExists.js";

describe("LicenseFileExists", () => {
	let testDir: string;

	beforeEach(() => {
		// Create a unique test directory
		testDir = join(
			tmpdir(),
			`repopo-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(testDir, { recursive: true });
	});

	afterEach(() => {
		// Clean up test directory
		rmSync(testDir, { recursive: true, force: true });
	});

	describe("policy matching", () => {
		it("should match package.json", () => {
			expect(LicenseFileExists.match.test("package.json")).toBe(true);
		});

		it("should not match other files", () => {
			expect(LicenseFileExists.match.test("README.md")).toBe(false);
			expect(LicenseFileExists.match.test("LICENSE")).toBe(false);
			expect(LicenseFileExists.match.test("src/index.ts")).toBe(false);
			expect(LicenseFileExists.match.test("docs/README.md")).toBe(false);
			expect(LicenseFileExists.match.test("test/example.test.ts")).toBe(false);
		});
	});

	describe("LICENSE file exists", () => {
		beforeEach(() => {
			writeFileSync(join(testDir, "LICENSE"), "MIT License\n\nCopyright...");
		});

		it("should pass when LICENSE file exists", async () => {
			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});

	describe("LICENSE file variations", () => {
		const licenseVariants = [
			"LICENSE",
			"LICENSE.txt",
			"LICENSE.md",
			"LICENSE.rst",
			"LICENCE",
			"LICENCE.txt",
			"LICENCE.md",
			"LICENCE.rst",
		];

		for (const variant of licenseVariants) {
			it(`should pass when ${variant} exists`, async () => {
				writeFileSync(join(testDir, variant), "License content");

				const result = await LicenseFileExists.handler({
					file: "package.json",
					root: testDir,
					resolve: false,
				});

				expect(result).toBe(true);
			});
		}
	});

	describe("missing LICENSE file", () => {
		it("should fail when no LICENSE file exists", async () => {
			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.name).toBe("LicenseFileExists");
				expect(result.file).toBe(".");
				expect(result.autoFixable).toBe(false);
				expect(result.errorMessages?.[0]).toContain("No LICENSE file found");
				expect(result.errorMessages?.[0]).toContain("LICENSE, LICENSE.txt");
			}
		});
	});

	describe("custom configuration", () => {
		it("should use custom accepted names when provided", async () => {
			// Create a file with custom name
			writeFileSync(join(testDir, "COPYING"), "GPL License content");

			const customConfig = {
				acceptedNames: ["COPYING", "COPYING.txt"],
			};

			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: false,
				config: customConfig,
			});

			expect(result).toBe(true);
		});

		it("should fail with custom config when file doesn't match", async () => {
			// Create standard LICENSE file
			writeFileSync(join(testDir, "LICENSE"), "MIT License");

			const customConfig = {
				acceptedNames: ["COPYING"],
			};

			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: false,
				config: customConfig,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages?.[0]).toContain("COPYING");
				expect(result.errorMessages?.[0]).not.toContain("LICENSE.txt");
			}
		});
	});

	describe("resolve behavior", () => {
		it("should not auto-fix missing LICENSE files", async () => {
			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: true,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
				expect("resolved" in result).toBe(false);
			}
		});
	});

	describe("edge cases", () => {
		it("should handle empty directory", async () => {
			const emptyDir = join(testDir, "empty");
			mkdirSync(emptyDir);

			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: emptyDir,
				resolve: false,
			});

			expect(result).not.toBe(true);
		});

		it("should handle case sensitivity based on file system", async () => {
			// Create lowercase license file
			writeFileSync(join(testDir, "license"), "License content");

			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: false,
			});

			// Behavior depends on filesystem case sensitivity
			// On case-insensitive FS (macOS default): passes because "license" matches "LICENSE"
			// On case-sensitive FS (Linux): fails because "license" !== "LICENSE"
			// We test that the policy doesn't crash and returns a valid result
			if (result === true) {
				// Case-insensitive filesystem
				expect(result).toBe(true);
			} else {
				// Case-sensitive filesystem
				expect(result).not.toBe(true);
				if (typeof result === "object") {
					expect(result.errorMessages?.[0]).toContain("No LICENSE file found");
				}
			}
		});

		it("should accept lowercase license with custom config", async () => {
			// Create lowercase license file
			writeFileSync(join(testDir, "license"), "License content");

			const customConfig = {
				acceptedNames: ["license", "LICENSE"],
			};

			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: false,
				config: customConfig,
			});

			// Should pass with custom config that includes lowercase variant
			expect(result).toBe(true);
		});

		it("should handle multiple LICENSE files gracefully", async () => {
			writeFileSync(join(testDir, "LICENSE"), "MIT License");
			writeFileSync(join(testDir, "LICENSE.txt"), "Also MIT License");

			const result = await LicenseFileExists.handler({
				file: "package.json",
				root: testDir,
				resolve: false,
			});

			expect(result).toBe(true);
		});
	});
});

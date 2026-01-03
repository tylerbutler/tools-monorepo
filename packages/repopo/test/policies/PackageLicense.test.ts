import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageLicense,
	type PackageLicenseSettings,
} from "../../src/policies/PackageLicense.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("PackageLicense policy", () => {
	let tempDir: string;
	const rootLicenseContent = "MIT License\n\nCopyright (c) 2024";
	const differentLicenseContent = "Apache License 2.0\n\nCopyright (c) 2024";

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-license-test-"));
		// Create root LICENSE by default
		writeFileSync(join(tempDir, "LICENSE"), rootLicenseContent);
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const createPackageJson = (
		json: PackageJson,
		subdir = "packages/my-pkg",
	): string => {
		const pkgDir = join(tempDir, subdir);
		mkdirSync(pkgDir, { recursive: true });
		const filePath = join(pkgDir, "package.json");
		writeFileSync(filePath, JSON.stringify(json, null, 2));
		return join(subdir, "package.json");
	};

	const createArgs = (
		file: string,
		config?: PackageLicenseSettings,
		resolve = false,
	): PolicyFunctionArguments<typeof config> => ({
		file: join(tempDir, file), // Full path for handler to read JSON
		root: tempDir,
		resolve,
		config,
	});

	describe("when package has matching LICENSE", () => {
		it("should pass validation", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			// Create matching LICENSE in package dir
			writeFileSync(
				join(tempDir, "packages/my-pkg/LICENSE"),
				rootLicenseContent,
			);

			const result = await PackageLicense.handler(createArgs(file));
			expect(result).toBe(true);
		});
	});

	describe("when package has no LICENSE", () => {
		it("should fail with autoFixable: true", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);

			const result = await PackageLicense.handler(createArgs(file));

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("missing");
				expect(result.autoFixable).toBe(true);
			}
		});

		it("should auto-fix by copying root LICENSE", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);

			const result = await PackageLicense.handler(
				createArgs(file, undefined, true),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify LICENSE was created
			const createdLicense = readFileSync(
				join(tempDir, "packages/my-pkg/LICENSE"),
				"utf-8",
			);
			expect(createdLicense).toBe(rootLicenseContent);
		});
	});

	describe("when package has different LICENSE", () => {
		it("should fail with autoFixable: true", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			// Create different LICENSE in package dir
			writeFileSync(
				join(tempDir, "packages/my-pkg/LICENSE"),
				differentLicenseContent,
			);

			const result = await PackageLicense.handler(createArgs(file));

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("doesn't match");
				expect(result.autoFixable).toBe(true);
			}
		});

		it("should auto-fix by overwriting with root LICENSE", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(
				join(tempDir, "packages/my-pkg/LICENSE"),
				differentLicenseContent,
			);

			const result = await PackageLicense.handler(
				createArgs(file, undefined, true),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify LICENSE was updated
			const updatedLicense = readFileSync(
				join(tempDir, "packages/my-pkg/LICENSE"),
				"utf-8",
			);
			expect(updatedLicense).toBe(rootLicenseContent);
		});
	});

	describe("private package handling", () => {
		it("should skip private packages by default", async () => {
			const json: PackageJson = {
				name: "@myorg/private-package",
				version: "1.0.0",
				private: true,
			};
			const file = createPackageJson(json);

			const result = await PackageLicense.handler(createArgs(file));
			expect(result).toBe(true);
		});

		it("should validate private packages when skipPrivate: false", async () => {
			const json: PackageJson = {
				name: "@myorg/private-package",
				version: "1.0.0",
				private: true,
			};
			const file = createPackageJson(json);

			const result = await PackageLicense.handler(
				createArgs(file, { skipPrivate: false }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("missing");
			}
		});
	});

	describe("custom license file name", () => {
		it("should use custom license file name", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			// Create LICENSE.txt at root and in package
			writeFileSync(join(tempDir, "LICENSE.txt"), rootLicenseContent);
			writeFileSync(
				join(tempDir, "packages/my-pkg/LICENSE.txt"),
				rootLicenseContent,
			);

			const result = await PackageLicense.handler(
				createArgs(file, { licenseFileName: "LICENSE.txt" }),
			);
			expect(result).toBe(true);
		});

		it("should fail when custom license file is missing", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(join(tempDir, "LICENSE.txt"), rootLicenseContent);

			const result = await PackageLicense.handler(
				createArgs(file, { licenseFileName: "LICENSE.txt" }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("LICENSE.txt");
			}
		});
	});

	describe("missing root LICENSE", () => {
		it("should fail when root LICENSE doesn't exist", async () => {
			// Remove root LICENSE
			rmSync(join(tempDir, "LICENSE"));

			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);

			const result = await PackageLicense.handler(createArgs(file));

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessage).toContain("root");
				expect(result.errorMessage).toContain("not found");
				expect(result.autoFixable).toBe(false);
			}
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageLicense.name).toBe("PackageLicense");
		});
	});
});

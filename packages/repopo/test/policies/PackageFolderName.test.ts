import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageFolderName,
	type PackageFolderNameConfig,
} from "../../src/policies/PackageFolderName.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("PackageFolderName policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-folder-name-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const createPackageJson = (folderName: string, json: PackageJson): string => {
		const folderPath = join(tempDir, "packages", folderName);
		mkdirSync(folderPath, { recursive: true });
		const filePath = join(folderPath, "package.json");
		writeFileSync(filePath, JSON.stringify(json, null, 2));
		return filePath;
	};

	const createArgs = (
		filePath: string,
		config?: PackageFolderNameConfig,
	): PolicyArgs<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve: false,
		config,
	});

	describe("when config is undefined", () => {
		it("should use defaults and validate folder names", async () => {
			const json: PackageJson = {
				name: "my-lib",
				version: "1.0.0",
			};
			const filePath = createPackageJson("my-lib", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toEqual([]);
		});
	});

	describe("unscoped packages", () => {
		it("should pass when folder name matches package name", async () => {
			const json: PackageJson = {
				name: "my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("my-package", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {}),
			);
			expect(result).toEqual([]);
		});

		it("should fail when folder name does not match package name", async () => {
			const json: PackageJson = {
				name: "my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("wrong-folder", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {}),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"wrong-folder",
				);
				expect(result.map((finding) => finding.message).join()).toContain(
					"my-package",
				);
				expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
					false,
				);
			}
		});
	});

	describe("scoped packages without stripScopes", () => {
		it("should expect full package name as folder name", async () => {
			// Note: When a folder name matches the full scoped package name,
			// it creates nested directories @myorg/my-package, and the immediate
			// parent folder would be "my-package". So we test against the expected
			// behavior: without stripScopes, we expect the full package name.
			const json: PackageJson = {
				name: "@myorg/my-package",
				version: "1.0.0",
			};
			// Create folder that will fail - no real way to have a folder literally named "@myorg/my-package"
			// since / is a path separator. The policy requires users to strip scopes for scoped packages.
			const filePath = createPackageJson("my-package", json);

			// Without stripScopes, the policy expects the full name "@myorg/my-package"
			// which can't be a real folder name, so this test documents the behavior
			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {}),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"my-package",
				);
				expect(result.map((finding) => finding.message).join()).toContain(
					"@myorg/my-package",
				);
			}
		});

		it("should fail when folder name is just the unscoped part without stripScopes", async () => {
			const json: PackageJson = {
				name: "@myorg/my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("my-package", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {}),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"my-package",
				);
				expect(result.map((finding) => finding.message).join()).toContain(
					"@myorg/my-package",
				);
			}
		});
	});

	describe("scoped packages with stripScopes", () => {
		it("should pass when folder name matches unscoped part for stripped scope", async () => {
			const json: PackageJson = {
				name: "@myorg/my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("my-package", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { stripScopes: ["@myorg"] }),
			);
			expect(result).toEqual([]);
		});

		it("should fail when folder name does not match stripped name", async () => {
			const json: PackageJson = {
				name: "@myorg/my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("wrong-folder", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { stripScopes: ["@myorg"] }),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"wrong-folder",
				);
				expect(result.map((finding) => finding.message).join()).toContain(
					"my-package",
				);
			}
		});

		it("should not strip scopes not in stripScopes list", async () => {
			const json: PackageJson = {
				name: "@other/my-package",
				version: "1.0.0",
			};
			// Expected folder name is the full package name since @other is not in stripScopes
			const filePath = createPackageJson("my-package", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { stripScopes: ["@myorg"] }),
			);

			// Should fail because @other is not in stripScopes, so full name is expected
			expect(result).not.toEqual([]);
		});

		it("should handle multiple scopes in stripScopes", async () => {
			const json: PackageJson = {
				name: "@internal/test-lib",
				version: "1.0.0",
			};
			const filePath = createPackageJson("test-lib", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {
					stripScopes: ["@myorg", "@internal", "@tools"],
				}),
			);
			expect(result).toEqual([]);
		});

		it("should strip all scopes with @* glob pattern", async () => {
			const json: PackageJson = {
				name: "@anyorg/my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("my-package", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { stripScopes: ["@*"] }),
			);
			expect(result).toEqual([]);
		});

		it("should strip scopes matching prefix glob pattern", async () => {
			const json: PackageJson = {
				name: "@fluid-internal/test-lib",
				version: "1.0.0",
			};
			const filePath = createPackageJson("test-lib", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { stripScopes: ["@fluid*"] }),
			);
			expect(result).toEqual([]);
		});

		it("should not strip scopes not matching glob pattern", async () => {
			const json: PackageJson = {
				name: "@other/my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("my-package", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { stripScopes: ["@fluid*"] }),
			);

			// Should fail because @other doesn't match @fluid*
			expect(result).not.toEqual([]);
		});
	});

	describe("excludePackages", () => {
		it("should skip validation for excluded packages", async () => {
			const json: PackageJson = {
				name: "@myorg/special-case",
				version: "1.0.0",
			};
			const filePath = createPackageJson("completely-different-name", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { excludePackages: ["@myorg/special-case"] }),
			);
			expect(result).toEqual([]);
		});

		it("should still validate non-excluded packages", async () => {
			const json: PackageJson = {
				name: "@myorg/not-excluded",
				version: "1.0.0",
			};
			const filePath = createPackageJson("wrong-name", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, { excludePackages: ["@myorg/other-package"] }),
			);
			expect(result).not.toEqual([]);
		});
	});

	describe("special cases", () => {
		it("should skip root package", async () => {
			const json: PackageJson = {
				name: "root",
				version: "1.0.0",
			};
			const filePath = createPackageJson("any-folder", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {}),
			);
			expect(result).toEqual([]);
		});

		it("should skip packages without a name", async () => {
			const json: PackageJson = {
				version: "1.0.0",
			};
			const filePath = createPackageJson("any-folder", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {}),
			);
			expect(result).toEqual([]);
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageFolderName.name).toBe("PackageFolderName");
		});

		it("should mark failures as not auto-fixable", async () => {
			const json: PackageJson = {
				name: "my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson("wrong-folder", json);

			const result = await runHandler(
				PackageFolderName.handler,
				createArgs(filePath, {}),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
					false,
				);
			}
		});
	});
});

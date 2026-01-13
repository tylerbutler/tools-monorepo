import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageAllowedScopes,
	type PackageAllowedScopesConfig,
} from "../../src/policies/PackageAllowedScopes.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";

describe("PackageAllowedScopes policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-scopes-test-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	const createPackageJson = (json: PackageJson): string => {
		const filePath = join(tempDir, "package.json");
		writeFileSync(filePath, JSON.stringify(json, null, 2));
		return filePath;
	};

	const createArgs = (
		filePath: string,
		config?: PackageAllowedScopesConfig,
	): PolicyFunctionArguments<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve: false,
		config,
	});

	describe("when config is undefined", () => {
		it("should pass validation", async () => {
			const json: PackageJson = {
				name: "@anyorg/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("allowedScopes validation", () => {
		it("should pass when package scope is in allowedScopes", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { allowedScopes: ["@myorg"] }),
			);
			expect(result).toBe(true);
		});

		it("should pass when package scope is one of multiple allowedScopes", async () => {
			const json: PackageJson = {
				name: "@internal/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, {
					allowedScopes: ["@myorg", "@internal", "@experimental"],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when package scope is not in allowedScopes", async () => {
			const json: PackageJson = {
				name: "@unknown/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { allowedScopes: ["@myorg"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("@unknown");
				expect(result.errorMessages.join()).toContain(
					"not in the allowed scopes",
				);
				expect(result.autoFixable).toBe(false);
			}
		});

		it("should fail when allowedScopes is empty", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { allowedScopes: [] }),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("unscopedPackages validation", () => {
		it("should pass when unscoped package is in unscopedPackages", async () => {
			const json: PackageJson = {
				name: "my-special-tool",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { unscopedPackages: ["my-special-tool"] }),
			);
			expect(result).toBe(true);
		});

		it("should pass when unscoped package is one of multiple unscopedPackages", async () => {
			const json: PackageJson = {
				name: "legacy-pkg",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, {
					unscopedPackages: ["my-special-tool", "legacy-pkg", "another-tool"],
				}),
			);
			expect(result).toBe(true);
		});

		it("should fail when unscoped package is not in unscopedPackages", async () => {
			const json: PackageJson = {
				name: "random-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { unscopedPackages: ["my-special-tool"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("random-package");
				expect(result.errorMessages.join()).toContain("unscoped package");
				expect(result.autoFixable).toBe(false);
			}
		});

		it("should fail when unscopedPackages is empty and package is unscoped", async () => {
			const json: PackageJson = {
				name: "my-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { unscopedPackages: [] }),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("combined configuration", () => {
		const fullConfig: PackageAllowedScopesConfig = {
			allowedScopes: ["@myorg", "@internal"],
			unscopedPackages: ["my-special-tool", "legacy-tool"],
		};

		it("should pass for package with allowed scope", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, fullConfig),
			);
			expect(result).toBe(true);
		});

		it("should pass for allowed unscoped package", async () => {
			const json: PackageJson = {
				name: "my-special-tool",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, fullConfig),
			);
			expect(result).toBe(true);
		});

		it("should fail for package with unknown scope", async () => {
			const json: PackageJson = {
				name: "@unknown/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, fullConfig),
			);

			expect(result).not.toBe(true);
		});

		it("should fail for unknown unscoped package", async () => {
			const json: PackageJson = {
				name: "unknown-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, fullConfig),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("special cases", () => {
		it("should skip root package", async () => {
			const json: PackageJson = {
				name: "root",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { allowedScopes: ["@myorg"] }),
			);

			expect(result).toBe(true);
		});

		it("should skip packages without a name", async () => {
			const json: PackageJson = {
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { allowedScopes: ["@myorg"] }),
			);

			expect(result).toBe(true);
		});

		it("should handle malformed scoped names (no slash)", async () => {
			const json: PackageJson = {
				name: "@malformed",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			// Malformed scope without slash is treated as unscoped
			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, {
					allowedScopes: ["@myorg"],
					unscopedPackages: [],
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("unscoped package");
			}
		});
	});

	describe("error messages", () => {
		it("should list allowed scopes in error message for scope violations", async () => {
			const json: PackageJson = {
				name: "@bad/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { allowedScopes: ["@good", "@better"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("@good");
				expect(result.errorMessages.join()).toContain("@better");
			}
		});

		it("should list allowed unscoped packages in error message for unscoped violations", async () => {
			const json: PackageJson = {
				name: "bad-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { unscopedPackages: ["good-pkg", "better-pkg"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("good-pkg");
				expect(result.errorMessages.join()).toContain("better-pkg");
			}
		});

		it("should show '(none)' when no scopes are configured", async () => {
			const json: PackageJson = {
				name: "@bad/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, {}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("(none)");
			}
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageAllowedScopes.name).toBe("PackageAllowedScopes");
		});

		it("should mark failures as not auto-fixable", async () => {
			const json: PackageJson = {
				name: "@unknown/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await PackageAllowedScopes.handler(
				createArgs(filePath, { allowedScopes: ["@myorg"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.autoFixable).toBe(false);
			}
		});
	});
});

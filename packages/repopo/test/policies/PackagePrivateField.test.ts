import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackagePrivateField,
	type PackagePrivateFieldConfig,
} from "../../src/policies/PackagePrivateField.js";
import type { PolicyFunctionArguments } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("PackagePrivateField policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-private-test-"));
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
		config?: PackagePrivateFieldConfig,
	): PolicyFunctionArguments<typeof config> => ({
		file: filePath,
		root: tempDir,
		resolve: false,
		config,
	});

	describe("when config is undefined", () => {
		it("should pass validation", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, undefined),
			);
			expect(result).toBe(true);
		});
	});

	describe("mustPublish validation", () => {
		it("should pass when package in mustPublish scope is not private", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mustPublish: ["@myorg/*"] }),
			);
			expect(result).toBe(true);
		});

		it("should pass when package in mustPublish scope has private: false", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
				private: false,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mustPublish: ["@myorg/*"] }),
			);
			expect(result).toBe(true);
		});

		it("should fail when package in mustPublish scope has private: true", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mustPublish: ["@myorg/*"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain(
					"must not be marked private",
				);
				expect(result.autoFixable).toBe(true);
			}
		});

		it("should match exact package name in mustPublish", async () => {
			const json: PackageJson = {
				name: "my-special-package",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mustPublish: ["my-special-package"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain(
					"must not be marked private",
				);
			}
		});
	});

	describe("mustBePrivate validation", () => {
		it("should pass when package in mustBePrivate scope has private: true", async () => {
			const json: PackageJson = {
				name: "@internal/test-package",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mustBePrivate: ["@internal/*"] }),
			);
			expect(result).toBe(true);
		});

		it("should fail when package in mustBePrivate scope is not private", async () => {
			const json: PackageJson = {
				name: "@internal/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mustBePrivate: ["@internal/*"] }),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("must be marked private");
				expect(result.autoFixable).toBe(true);
			}
		});

		it("should fail when package in mustBePrivate scope has private: false", async () => {
			const json: PackageJson = {
				name: "@internal/test-package",
				version: "1.0.0",
				private: false,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mustBePrivate: ["@internal/*"] }),
			);

			expect(result).not.toBe(true);
		});
	});

	describe("mayPublish validation", () => {
		it("should pass when package in mayPublish scope is private", async () => {
			const json: PackageJson = {
				name: "@experimental/test-package",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mayPublish: ["@experimental/*"] }),
			);
			expect(result).toBe(true);
		});

		it("should pass when package in mayPublish scope is not private", async () => {
			const json: PackageJson = {
				name: "@experimental/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, { mayPublish: ["@experimental/*"] }),
			);
			expect(result).toBe(true);
		});
	});

	describe("unmatchedPackages behavior", () => {
		it("should require private by default for unmatched packages", async () => {
			const json: PackageJson = {
				name: "@unknown/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, {
					mustPublish: ["@myorg/*"],
					// unmatchedPackages defaults to "private"
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("must be marked private");
			}
		});

		it("should require public when unmatchedPackages is 'public'", async () => {
			const json: PackageJson = {
				name: "@unknown/test-package",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, {
					mustPublish: ["@myorg/*"],
					unmatchedPackages: "public",
				}),
			);

			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain(
					"must not be marked private",
				);
			}
		});

		it("should pass when unmatchedPackages is 'ignore'", async () => {
			const json: PackageJson = {
				name: "@unknown/test-package",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, {
					mustPublish: ["@myorg/*"],
					unmatchedPackages: "ignore",
				}),
			);

			expect(result).toBe(true);
		});
	});

	describe("priority order", () => {
		it("should prioritize mustPublish over mustBePrivate", async () => {
			// If a package matches both, mustPublish wins
			const json: PackageJson = {
				name: "@myorg/internal",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, {
					mustPublish: ["@myorg/*"],
					mustBePrivate: ["@myorg/internal"], // exact match shouldn't override scope
				}),
			);

			// mustPublish is checked first, so package should not be private
			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain(
					"must not be marked private",
				);
			}
		});

		it("should prioritize mustBePrivate over mayPublish", async () => {
			const json: PackageJson = {
				name: "@internal/experimental-pkg",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, {
					mustBePrivate: ["@internal/*"],
					mayPublish: ["@internal/experimental-pkg"],
				}),
			);

			// mustBePrivate is checked before mayPublish
			expect(result).not.toBe(true);
			if (typeof result === "object") {
				expect(result.errorMessages.join()).toContain("must be marked private");
			}
		});
	});

	describe("special cases", () => {
		it("should skip root package", async () => {
			const json: PackageJson = {
				name: "root",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, {
					mustBePrivate: ["root"],
				}),
			);

			expect(result).toBe(true);
		});

		it("should skip packages without a name", async () => {
			const json: PackageJson = {
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(
				PackagePrivateField.handler,
				createArgs(filePath, {
					mustBePrivate: ["@internal/*"],
				}),
			);

			expect(result).toBe(true);
		});
	});

	describe("combined configuration", () => {
		it("should correctly categorize packages with full config", async () => {
			const config: PackagePrivateFieldConfig = {
				mustPublish: ["@public/*", "named-public-pkg"],
				mustBePrivate: ["@private/*"],
				mayPublish: ["@experimental/*"],
				unmatchedPackages: "private",
			};

			// Public package without private field - should pass
			const publicJson: PackageJson = { name: "@public/pkg", version: "1.0.0" };
			const publicPath = createPackageJson(publicJson);
			let result = await runHandler(
				PackagePrivateField.handler,
				createArgs(publicPath, config),
			);
			expect(result).toBe(true);

			// Private package with private: true - should pass
			const privateJson: PackageJson = {
				name: "@private/pkg",
				version: "1.0.0",
				private: true,
			};
			const privatePath = createPackageJson(privateJson);
			result = await runHandler(
				PackagePrivateField.handler,
				createArgs(privatePath, config),
			);
			expect(result).toBe(true);

			// Experimental package (either state ok) - should pass
			const expJson: PackageJson = {
				name: "@experimental/pkg",
				version: "1.0.0",
			};
			const expPath = createPackageJson(expJson);
			result = await runHandler(
				PackagePrivateField.handler,
				createArgs(expPath, config),
			);
			expect(result).toBe(true);

			// Unknown package without private: true - should fail (default is private)
			const unknownJson: PackageJson = {
				name: "@unknown/pkg",
				version: "1.0.0",
			};
			const unknownPath = createPackageJson(unknownJson);
			result = await runHandler(
				PackagePrivateField.handler,
				createArgs(unknownPath, config),
			);
			expect(result).not.toBe(true);
		});
	});

	describe("auto-fix", () => {
		it("should add private: true when missing", async () => {
			const json: PackageJson = {
				name: "@internal/test-package",
				version: "1.0.0",
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(PackagePrivateField.handler, {
				...createArgs(filePath, { mustBePrivate: ["@internal/*"] }),
				resolve: true,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify the file was updated
			const updatedJson = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedJson.private).toBe(true);
		});

		it("should remove private: true when not allowed", async () => {
			const json: PackageJson = {
				name: "@public/test-package",
				version: "1.0.0",
				private: true,
			};
			const filePath = createPackageJson(json);

			const result = await runHandler(PackagePrivateField.handler, {
				...createArgs(filePath, { mustPublish: ["@public/*"] }),
				resolve: true,
			});

			expect(result).not.toBe(true);
			if (typeof result === "object" && "resolved" in result) {
				expect(result.resolved).toBe(true);
			}

			// Verify the file was updated
			const updatedJson = JSON.parse(readFileSync(filePath, "utf-8"));
			expect(updatedJson.private).toBeUndefined();
		});
	});
});

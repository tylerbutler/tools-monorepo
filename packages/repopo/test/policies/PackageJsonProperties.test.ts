import { run } from "effection";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PackageJson } from "type-fest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	PackageJsonProperties,
	type PackageJsonPropertiesSettings,
} from "../../src/policies/PackageJsonProperties.js";
import type { PolicyFailure, PolicyFixResult } from "../../src/policy.js";

describe("PackageJsonProperties Policy", () => {
	let testDir: string;
	let packageJsonPath: string;

	beforeEach(async () => {
		testDir = await mkdtemp(join(tmpdir(), "repopo-props-test-"));
		packageJsonPath = join(testDir, "package.json");
	});

	afterEach(async () => {
		await rm(testDir, { recursive: true, force: true });
	});

	describe("Policy Definition", () => {
		it("should have correct policy name", () => {
			expect(PackageJsonProperties.name).toBe("PackageJsonProperties");
		});

		it("should match package.json files", () => {
			expect(PackageJsonProperties.match).toBeDefined();
			expect("package.json").toMatch(PackageJsonProperties.match);
		});
	});

	describe("Verbatim Property Enforcement", () => {
		it("should pass when properties match verbatim config", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				license: "MIT",
				author: "Test Author",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
					author: "Test Author",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			);

			expect(result).toBe(true);
		});

		it("should fail when property value differs", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				license: "Apache-2.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.autoFixable).toBe(true);
			expect(result.errorMessage).toContain("license");
		});

		it("should fail when property is missing", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
					author: "Test Author",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.errorMessage).toContain("license");
			expect(result.errorMessage).toContain("author");
		});

		it("should check multiple properties", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				license: "MIT",
				author: "Wrong Author",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
					author: "Test Author",
					homepage: "https://example.com",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.errorMessage).toContain("author");
			expect(result.errorMessage).toContain("homepage");
			expect(result.errorMessage).not.toContain("license");
		});

		it("should pass when config is undefined", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config: undefined,
				}),
			);

			expect(result).toBe(true);
		});
	});

	describe("Auto-Fix Behavior", () => {
		it("should be marked as auto-fixable", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			expect(result.autoFixable).toBe(true);
		});

		it("should fix missing properties when resolve is true", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
					author: "Test Author <test@example.com>",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config,
				}),
			) as PolicyFixResult;

			expect(result.resolved).toBe(true);

			// Verify file was updated
			const updatedContent = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(updatedContent.license).toBe("MIT");
			expect(updatedContent.author).toBe("Test Author <test@example.com>");
			expect(updatedContent.name).toBe("test-package");
			expect(updatedContent.version).toBe("1.0.0");
		});

		it("should fix incorrect property values", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				license: "Apache-2.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
				},
			};

			await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config,
				}),
			);

			const updatedContent = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(updatedContent.license).toBe("MIT");
		});

		it("should preserve existing properties not in verbatim", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				description: "A test package",
				keywords: ["test", "example"],
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
				},
			};

			await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config,
				}),
			);

			const updatedContent = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(updatedContent.name).toBe("test-package");
			expect(updatedContent.version).toBe("1.0.0");
			expect(updatedContent.description).toBe("A test package");
			expect(updatedContent.keywords).toEqual(["test", "example"]);
			expect(updatedContent.license).toBe("MIT");
		});

		it("should not modify file when resolve is false", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			const originalContent = JSON.stringify(packageJson, null, 2);
			await writeFile(packageJsonPath, originalContent);

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
				},
			};

			await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			);

			const content = await readFile(packageJsonPath, "utf-8");
			expect(content).toBe(originalContent);
		});

		it("should format JSON with tabs", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
				},
			};

			await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config,
				}),
			);

			const content = await readFile(packageJsonPath, "utf-8");
			expect(content).toContain("\t");
		});
	});

	describe("Complex Property Scenarios", () => {
		it("should handle nested object properties", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				repository: {
					type: "git",
					url: "wrong-url",
				},
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					repository: {
						type: "git",
						url: "https://github.com/test/repo.git",
					},
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			expect(result).not.toBe(true);
			expect(result.errorMessage).toContain("repository");
		});

		it("should handle array properties", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				keywords: ["wrong", "keywords"],
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					keywords: ["test", "example"],
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			expect(result).not.toBe(true);
		});

		it("should handle bugs object", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					bugs: {
						url: "https://github.com/test/repo/issues",
					},
				},
			};

			await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: true,
					config,
				}),
			);

			const updatedContent = JSON.parse(await readFile(packageJsonPath, "utf-8"));
			expect(updatedContent.bugs).toEqual({
				url: "https://github.com/test/repo/issues",
			});
		});
	});

	describe("Error Messages", () => {
		it("should provide clear error for single property mismatch", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
				license: "Apache-2.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			expect(result.errorMessage).toBeDefined();
			expect(result.errorMessage).toContain("license");
			expect(result.errorMessage).toContain("Incorrect");
		});

		it("should list all property mismatches", async () => {
			const packageJson: PackageJson = {
				name: "test-package",
				version: "1.0.0",
			};

			await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

			const config: PackageJsonPropertiesSettings = {
				verbatim: {
					license: "MIT",
					author: "Test",
					homepage: "https://example.com",
				},
			};

			const result = await run(() =>
				PackageJsonProperties.handler({
					file: packageJsonPath,
					root: testDir,
					resolve: false,
					config,
				}),
			) as PolicyFailure;

			const errorLines = result.errorMessage.split("\n");
			expect(errorLines.length).toBeGreaterThan(1);
		});
	});
});

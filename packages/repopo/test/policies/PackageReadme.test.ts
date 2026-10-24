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
	PackageReadme,
	type PackageReadmeSettings,
} from "../../src/policies/PackageReadme.js";
import type { PolicyArgs } from "../../src/policy.js";
import { runHandler } from "../test-helpers.js";

describe("PackageReadme policy", () => {
	let tempDir: string;
	const originalCwd = process.cwd();

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "repopo-readme-test-"));
	});

	afterEach(() => {
		process.chdir(originalCwd);
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
		config?: PackageReadmeSettings,
		resolve = false,
	): PolicyArgs<typeof config> => ({
		file,
		root: tempDir,
		resolve,
		config,
	});

	describe("when README exists with matching title", () => {
		it("should resolve the package path from root when run from a repository subdirectory", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			process.chdir(join(tempDir, "packages"));
			writeFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"# @myorg/test-package\n\nSome content.",
			);

			const result = await runHandler(PackageReadme.handler, createArgs(file));
			expect(result).toEqual([]);
		});
	});

	describe("when README is missing", () => {
		it("should fail with autoFixable: true", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);

			const result = await runHandler(PackageReadme.handler, createArgs(file));
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"missing",
				);
				expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
					true,
				);
			}
		});

		it("should auto-fix by creating README with package name", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);

			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, undefined, true),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object" && result.length > 0) {
				expect(
					result.length > 0 &&
						result.every((finding) => finding.fixStatus === "fixed"),
				).toBe(true);
			}

			// Verify README was created with correct title
			const createdReadme = readFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"utf-8",
			);
			expect(createdReadme).toContain("# @myorg/test-package");
		});

		it("should include requiredContent when auto-fixing", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);

			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, { requiredContent: "## Trademark" }, true),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object" && result.length > 0) {
				expect(
					result.length > 0 &&
						result.every((finding) => finding.fixStatus === "fixed"),
				).toBe(true);
			}

			const createdReadme = readFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"utf-8",
			);
			expect(createdReadme).toContain("# @myorg/test-package");
			expect(createdReadme).toContain("## Trademark");
		});
	});

	describe("title validation", () => {
		it("keeps an unresolved title alongside successfully fixed required content", async () => {
			const file = createPackageJson({
				name: "@myorg/test-package",
				version: "1.0.0",
			});
			const readme = join(tempDir, "packages/my-pkg/README.md");
			writeFileSync(readme, "# Wrong Title\n\nSome content.\n");
			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, { requiredContent: "## Trademark" }, true),
			);
			expect(result).toEqual([
				{
					message: `README title "Wrong Title" doesn't match package name "@myorg/test-package"`,
				},
				{
					message: 'README missing required content: "## Trademark"',
					fixStatus: "fixed",
				},
			]);
			expect(readFileSync(readme, "utf8")).toContain("## Trademark");
		});

		it("should fail when title doesn't match package name", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"# Wrong Title\n\nSome content.",
			);

			const result = await runHandler(PackageReadme.handler, createArgs(file));
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"doesn't match",
				);
				expect(result.map((finding) => finding.message).join()).toContain(
					"Wrong Title",
				);
			}
		});

		it("should fail when README has no title", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"No title here, just content.",
			);

			const result = await runHandler(PackageReadme.handler, createArgs(file));
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"(none)",
				);
			}
		});

		it("should skip title validation when requireMatchingTitle: false", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"# Any Title\n\nSome content.",
			);

			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, { requireMatchingTitle: false }),
			);
			expect(result).toEqual([]);
		});
	});

	describe("required content validation", () => {
		it("should pass when required content exists", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"# @myorg/test-package\n\nContent\n\n## Trademark\n\nNotice here.",
			);

			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, { requiredContent: "## Trademark" }),
			);
			expect(result).toEqual([]);
		});

		it("should fail when required content is missing", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"# @myorg/test-package\n\nContent without trademark.",
			);

			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, { requiredContent: "## Trademark" }),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"missing required content",
				);
				expect(result.some((finding) => finding.fixStatus !== undefined)).toBe(
					true,
				);
			}
		});

		it("should auto-fix by appending required content", async () => {
			const json: PackageJson = {
				name: "@myorg/test-package",
				version: "1.0.0",
			};
			const file = createPackageJson(json);
			writeFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"# @myorg/test-package\n\nContent\n",
			);

			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, { requiredContent: "## Trademark" }, true),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object" && result.length > 0) {
				expect(
					result.length > 0 &&
						result.every((finding) => finding.fixStatus === "fixed"),
				).toBe(true);
			}

			const updatedReadme = readFileSync(
				join(tempDir, "packages/my-pkg/README.md"),
				"utf-8",
			);
			expect(updatedReadme).toContain("## Trademark");
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

			const result = await runHandler(PackageReadme.handler, createArgs(file));
			expect(result).toEqual([]);
		});

		it("should validate private packages when skipPrivate: false", async () => {
			const json: PackageJson = {
				name: "@myorg/private-package",
				version: "1.0.0",
				private: true,
			};
			const file = createPackageJson(json);

			const result = await runHandler(
				PackageReadme.handler,
				createArgs(file, { skipPrivate: false }),
			);
			expect(result).not.toEqual([]);
			if (typeof result === "object") {
				expect(result.map((finding) => finding.message).join()).toContain(
					"missing",
				);
			}
		});
	});

	describe("policy metadata", () => {
		it("should have correct name", () => {
			expect(PackageReadme.name).toBe("PackageReadme");
		});
	});
});

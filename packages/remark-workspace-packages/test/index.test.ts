import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { remarkWorkspacePackages } from "../src/index.js";

// Create a unique temp directory for each test run
const testDir = join(tmpdir(), `remark-workspace-packages-test-${Date.now()}`);

beforeEach(() => {
	if (!existsSync(testDir)) {
		mkdirSync(testDir, { recursive: true });
	}
});

afterEach(() => {
	if (existsSync(testDir)) {
		rmSync(testDir, { recursive: true, force: true });
	}
});

/**
 * Helper to create a pnpm workspace with pnpm-workspace.yaml and root package.json.
 * The resolve-workspace-root library requires both files for pnpm workspaces.
 */
function createPnpmWorkspace(packages: string[]): void {
	writeFileSync(
		join(testDir, "pnpm-workspace.yaml"),
		`packages:\n${packages.map((p) => `  - "${p}"`).join("\n")}\n`,
	);
	// Root package.json is required by resolve-workspace-root for pnpm workspaces
	writeFileSync(
		join(testDir, "package.json"),
		JSON.stringify({ name: "test-workspace", version: "1.0.0" }, null, 2),
	);
}

/**
 * Helper to create a package.json in a directory
 */
function createPackageJson(
	relativePath: string,
	pkg: { name: string; description?: string; private?: boolean },
): void {
	const dir = join(testDir, relativePath);
	mkdirSync(dir, { recursive: true });
	writeFileSync(join(dir, "package.json"), JSON.stringify(pkg, null, 2));
}

/**
 * Helper to process markdown with the plugin
 */
async function processMarkdown(
	markdown: string,
	options?: Parameters<typeof remarkWorkspacePackages>[0],
): Promise<string> {
	const result = await remark()
		.use(remarkGfm)
		.use(remarkWorkspacePackages, options)
		.process({
			value: markdown,
			path: join(testDir, "README.md"),
		});
	return String(result);
}

/**
 * Helper to check if a table row exists with the given package name
 */
function hasTableRow(result: string, packageName: string): boolean {
	// Match table row with package name as inline code or link
	const codePattern = new RegExp(`\\|\\s*\`${escapeRegex(packageName)}\``);
	const linkPattern = new RegExp(
		`\\|\\s*\\[\\s*\`${escapeRegex(packageName)}\`\\s*\\]`,
	);
	return codePattern.test(result) || linkPattern.test(result);
}

/**
 * Helper to check if a table row has a specific description
 */
function hasTableRowWithDescription(
	result: string,
	packageName: string,
	description: string,
): boolean {
	// Match table row with package name and description
	const pattern = new RegExp(
		`\\|[^|]*${escapeRegex(packageName)}[^|]*\\|\\s*${escapeRegex(description)}\\s*\\|`,
	);
	return pattern.test(result);
}

/**
 * Helper to escape regex special characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("remarkWorkspacePackages", () => {
	describe("basic functionality", () => {
		it("should generate a table from pnpm workspace packages", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", {
				name: "@test/foo",
				description: "Foo package",
			});
			createPackageJson("packages/bar", {
				name: "@test/bar",
				description: "Bar package",
			});

			const result = await processMarkdown("# My Workspace\n\nSome content.");

			expect(result).toContain("<!-- workspace-packages-start -->");
			expect(result).toContain("<!-- workspace-packages-end -->");
			expect(result).toMatch(/\|\s*Package\s*\|\s*Description\s*\|/);
			expect(hasTableRow(result, "@test/bar")).toBe(true);
			expect(hasTableRow(result, "@test/foo")).toBe(true);
		});

		it("should sort packages alphabetically", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/zebra", {
				name: "zebra",
				description: "Z package",
			});
			createPackageJson("packages/alpha", {
				name: "alpha",
				description: "A package",
			});

			const result = await processMarkdown("# Workspace");

			const alphaIndex = result.indexOf("`alpha`");
			const zebraIndex = result.indexOf("`zebra`");

			expect(alphaIndex).toBeLessThan(zebraIndex);
		});

		it("should append table at EOF when no markers exist", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const markdown = "# My Workspace\n\nSome content.";
			const result = await processMarkdown(markdown);

			expect(result).toMatch(
				/Some content\.\n\n<!-- workspace-packages-start -->/,
			);
		});

		it("should not create table when no packages exist", async () => {
			createPnpmWorkspace(["packages/*"]);

			const markdown = "# My Workspace";
			const result = await processMarkdown(markdown);

			expect(result).not.toContain("<!-- workspace-packages-start -->");
		});

		it("should skip processing when no file path is available", async () => {
			const result = await remark()
				.use(remarkGfm)
				.use(remarkWorkspacePackages)
				.process({ value: "# Test" });

			expect(String(result)).toBe("# Test\n");
		});
	});

	describe("marker handling", () => {
		it("should replace content between existing markers", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });
			createPackageJson("packages/bar", { name: "bar", description: "Bar" });

			const markdown = `# My Workspace

<!-- workspace-packages-start -->
| Package | Description |
|---------|-------------|
| \`old\` | old package |
<!-- workspace-packages-end -->

## Footer`;

			const result = await processMarkdown(markdown);

			expect(hasTableRow(result, "foo")).toBe(true);
			expect(hasTableRow(result, "bar")).toBe(true);
			expect(result).not.toContain("`old`");
			expect(result).toContain("## Footer");
		});

		it("should handle custom section prefix", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const markdown = `# Workspace

<!-- packages-start -->
old content
<!-- packages-end -->`;

			const result = await processMarkdown(markdown, {
				sectionPrefix: "packages",
			});

			expect(result).toContain("<!-- packages-start -->");
			expect(result).toContain("<!-- packages-end -->");
			expect(hasTableRow(result, "foo")).toBe(true);
			expect(result).not.toContain("old content");
		});
	});

	describe("description preservation", () => {
		it("should preserve user-edited descriptions for existing packages", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", {
				name: "foo",
				description: "Original description",
			});
			createPackageJson("packages/bar", {
				name: "bar",
				description: "Bar original",
			});

			const markdown = `# My Workspace

<!-- workspace-packages-start -->
| Package | Description |
|---------|-------------|
| \`foo\` | Custom edited description |
<!-- workspace-packages-end -->`;

			const result = await processMarkdown(markdown);

			// Existing description should be preserved
			expect(
				hasTableRowWithDescription(result, "foo", "Custom edited description"),
			).toBe(true);
			// New package should use package.json description
			expect(hasTableRowWithDescription(result, "bar", "Bar original")).toBe(
				true,
			);
		});

		it("should remove rows for deleted packages", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const markdown = `# My Workspace

<!-- workspace-packages-start -->
| Package | Description |
|---------|-------------|
| \`foo\` | Foo package |
| \`deleted\` | This package no longer exists |
<!-- workspace-packages-end -->`;

			const result = await processMarkdown(markdown);

			expect(hasTableRow(result, "foo")).toBe(true);
			expect(result).not.toContain("`deleted`");
		});
	});

	describe("filtering", () => {
		it("should exclude packages matching exclude patterns", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/public", {
				name: "@test/public",
				description: "Public",
			});
			createPackageJson("packages/internal", {
				name: "@internal/private",
				description: "Internal",
			});

			const result = await processMarkdown("# Workspace", {
				exclude: ["@internal/*"],
			});

			expect(hasTableRow(result, "@test/public")).toBe(true);
			expect(hasTableRow(result, "@internal/private")).toBe(false);
		});

		it("should only include packages matching include patterns", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/cli", {
				name: "@test/cli",
				description: "CLI",
			});
			createPackageJson("packages/lib", {
				name: "@test/lib",
				description: "Library",
			});
			createPackageJson("packages/other", {
				name: "other",
				description: "Other",
			});

			const result = await processMarkdown("# Workspace", {
				include: ["@test/*"],
			});

			expect(hasTableRow(result, "@test/cli")).toBe(true);
			expect(hasTableRow(result, "@test/lib")).toBe(true);
			expect(hasTableRow(result, "other")).toBe(false);
		});

		it("should exclude private packages when includePrivate is false", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/public", {
				name: "public-pkg",
				description: "Public",
			});
			createPackageJson("packages/private", {
				name: "private-pkg",
				description: "Private",
				private: true,
			});

			const result = await processMarkdown("# Workspace", {
				includePrivate: false,
			});

			expect(hasTableRow(result, "public-pkg")).toBe(true);
			expect(hasTableRow(result, "private-pkg")).toBe(false);
		});

		it("should include private packages by default", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/private", {
				name: "private-pkg",
				description: "Private",
				private: true,
			});

			const result = await processMarkdown("# Workspace");

			expect(hasTableRow(result, "private-pkg")).toBe(true);
		});
	});

	describe("column configuration", () => {
		it("should support custom columns", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const result = await processMarkdown("# Workspace", {
				columns: ["name", "description", "path"],
			});

			expect(result).toMatch(
				/\|\s*Package\s*\|\s*Description\s*\|\s*Path\s*\|/,
			);
			expect(result).toContain("`packages/foo`");
		});

		it("should support custom column headers", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const result = await processMarkdown("# Workspace", {
				columnHeaders: {
					name: "Name",
					description: "Purpose",
				},
			});

			expect(result).toMatch(/\|\s*Name\s*\|\s*Purpose\s*\|/);
		});
	});

	describe("link generation", () => {
		it("should include links by default", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const result = await processMarkdown("# Workspace");

			expect(result).toContain("[`foo`](./packages/foo)");
		});

		it("should not include links when includeLinks is false", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const result = await processMarkdown("# Workspace", {
				includeLinks: false,
			});

			expect(result).not.toContain("[`foo`]");
			expect(result).toContain("| `foo`");
		});
	});

	describe("workspace detection", () => {
		it("should detect npm workspaces from package.json", async () => {
			// Create root package.json with workspaces field
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({
					name: "root",
					workspaces: ["packages/*"],
				}),
			);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const result = await processMarkdown("# Workspace");

			expect(hasTableRow(result, "foo")).toBe(true);
		});

		it("should support custom workspace root", async () => {
			const subDir = join(testDir, "subworkspace");
			mkdirSync(subDir, { recursive: true });
			writeFileSync(
				join(subDir, "pnpm-workspace.yaml"),
				'packages:\n  - "pkgs/*"\n',
			);
			mkdirSync(join(subDir, "pkgs", "bar"), { recursive: true });
			writeFileSync(
				join(subDir, "pkgs", "bar", "package.json"),
				JSON.stringify({ name: "bar", description: "Bar" }),
			);

			const result = await processMarkdown("# Workspace", {
				workspaceRoot: "./subworkspace",
			});

			expect(hasTableRow(result, "bar")).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle empty markdown file", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo", description: "Foo" });

			const result = await processMarkdown("");

			expect(result).toContain("<!-- workspace-packages-start -->");
			expect(hasTableRow(result, "foo")).toBe(true);
		});

		it("should handle packages without description", async () => {
			createPnpmWorkspace(["packages/*"]);
			createPackageJson("packages/foo", { name: "foo" });

			const result = await processMarkdown("# Workspace");

			expect(hasTableRow(result, "foo")).toBe(true);
		});

		it("should handle packages without name gracefully", async () => {
			createPnpmWorkspace(["packages/*"]);
			const dir = join(testDir, "packages", "noname");
			mkdirSync(dir, { recursive: true });
			writeFileSync(
				join(dir, "package.json"),
				JSON.stringify({ description: "No name" }),
			);
			createPackageJson("packages/valid", {
				name: "valid",
				description: "Valid",
			});

			const result = await processMarkdown("# Workspace");

			expect(hasTableRow(result, "valid")).toBe(true);
			expect(result).not.toContain("No name");
		});
	});

	describe("integration with real workspace", () => {
		/**
		 * Process markdown from the real project directory
		 */
		async function processMarkdownFromProject(
			markdown: string,
			options?: Parameters<typeof remarkWorkspacePackages>[0],
		): Promise<string> {
			const projectDir = process.cwd();
			const result = await remark()
				.use(remarkGfm)
				.use(remarkWorkspacePackages, options)
				.process({
					value: markdown,
					path: join(projectDir, "README.md"),
				});
			return String(result);
		}

		it("should detect packages from the actual workspace", async () => {
			const result = await processMarkdownFromProject("# Workspace");

			// Should find the remark-workspace-packages package itself
			expect(hasTableRow(result, "remark-workspace-packages")).toBe(true);
			// And other packages in the monorepo
			expect(hasTableRow(result, "remark-task-table")).toBe(true);
		});

		it("should respect exclude patterns for real packages", async () => {
			const result = await processMarkdownFromProject("# Workspace", {
				exclude: ["*-docs", "@tylerbu/*"],
			});

			expect(hasTableRow(result, "ccl-docs")).toBe(false);
			expect(hasTableRow(result, "@tylerbu/cli")).toBe(false);
			expect(hasTableRow(result, "remark-task-table")).toBe(true);
		});
	});
});

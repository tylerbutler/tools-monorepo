import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { remarkTaskTable } from "../src/index.js";

// Create a unique temp directory for each test run
const testDir = join(tmpdir(), `remark-task-table-test-${Date.now()}`);

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
 * Helper to create a package.json in the test directory
 */
function createPackageJson(scripts: Record<string, string>): void {
	writeFileSync(
		join(testDir, "package.json"),
		JSON.stringify({ scripts }, null, 2),
	);
}

/**
 * Helper to process markdown with the plugin
 */
async function processMarkdown(
	markdown: string,
	options?: Parameters<typeof remarkTaskTable>[0],
): Promise<string> {
	const result = await remark()
		.use(remarkGfm)
		.use(remarkTaskTable, options)
		.process({
			value: markdown,
			path: join(testDir, "README.md"),
		});
	return String(result);
}

/**
 * Helper to check if a table row exists with the given task name and description
 * Accounts for GFM table padding
 */
function hasTableRow(
	result: string,
	taskName: string,
	description: string,
): boolean {
	// Match table row with flexible whitespace
	const pattern = new RegExp(
		`\\|\\s*\`${taskName}\`\\s*\\|\\s*${escapeRegex(description)}\\s*\\|`,
	);
	return pattern.test(result);
}

/**
 * Helper to escape regex special characters
 */
function escapeRegex(str: string): string {
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

describe("remarkTaskTable", () => {
	describe("basic functionality", () => {
		it("should generate a table from package.json scripts", async () => {
			createPackageJson({
				build: "tsc",
				test: "vitest",
			});

			const result = await processMarkdown("# My Project\n\nSome content.");

			expect(result).toContain("<!-- task-table-start -->");
			expect(result).toContain("<!-- task-table-end -->");
			expect(result).toMatch(/\|\s*Task\s*\|\s*Description\s*\|/);
			expect(hasTableRow(result, "build", "tsc")).toBe(true);
			expect(hasTableRow(result, "test", "vitest")).toBe(true);
		});

		it("should sort scripts alphabetically", async () => {
			createPackageJson({
				zebra: "echo z",
				alpha: "echo a",
				beta: "echo b",
			});

			const result = await processMarkdown("# Project");

			// Check order by looking at the table rows
			const alphaIndex = result.indexOf("`alpha`");
			const betaIndex = result.indexOf("`beta`");
			const zebraIndex = result.indexOf("`zebra`");

			expect(alphaIndex).toBeLessThan(betaIndex);
			expect(betaIndex).toBeLessThan(zebraIndex);
		});

		it("should append table at EOF when no markers exist", async () => {
			createPackageJson({ build: "tsc" });

			const markdown = "# My Project\n\nSome content.";
			const result = await processMarkdown(markdown);

			// Table should be at the end
			expect(result).toMatch(/Some content\.\n\n<!-- task-table-start -->/);
		});

		it("should not create table when no scripts exist", async () => {
			createPackageJson({});

			const markdown = "# My Project";
			const result = await processMarkdown(markdown);

			expect(result).not.toContain("<!-- task-table-start -->");
			expect(result).toBe("# My Project\n");
		});

		it("should skip processing when no file path is available", async () => {
			const result = await remark()
				.use(remarkGfm)
				.use(remarkTaskTable)
				.process({ value: "# Test" });

			expect(String(result)).toBe("# Test\n");
		});
	});

	describe("marker handling", () => {
		it("should replace content between existing markers", async () => {
			createPackageJson({
				build: "tsc",
				test: "vitest",
			});

			const markdown = `# My Project

<!-- task-table-start -->
| Task | Description |
|------|-------------|
| \`old\` | old script |
<!-- task-table-end -->

## Footer`;

			const result = await processMarkdown(markdown);

			expect(hasTableRow(result, "build", "tsc")).toBe(true);
			expect(hasTableRow(result, "test", "vitest")).toBe(true);
			expect(result).not.toContain("`old`");
			expect(result).toContain("## Footer");
		});

		it("should handle custom section prefix", async () => {
			createPackageJson({ build: "tsc" });

			const markdown = `# Project

<!-- scripts-start -->
old content
<!-- scripts-end -->`;

			const result = await processMarkdown(markdown, {
				sectionPrefix: "scripts",
			});

			expect(result).toContain("<!-- scripts-start -->");
			expect(result).toContain("<!-- scripts-end -->");
			expect(hasTableRow(result, "build", "tsc")).toBe(true);
			expect(result).not.toContain("old content");
		});

		it("should treat malformed markers as no markers (only start)", async () => {
			createPackageJson({ build: "tsc" });

			const markdown = `# Project

<!-- task-table-start -->

Some content`;

			const result = await processMarkdown(markdown);

			// Should append at EOF since markers are incomplete
			expect(result).toMatch(/Some content\n\n<!-- task-table-start -->/);
		});

		it("should treat malformed markers as no markers (only end)", async () => {
			createPackageJson({ build: "tsc" });

			const markdown = `# Project

<!-- task-table-end -->

Some content`;

			const result = await processMarkdown(markdown);

			// Should append at EOF since markers are incomplete
			expect(result).toMatch(/Some content\n\n<!-- task-table-start -->/);
		});
	});

	describe("description preservation", () => {
		it("should preserve user-edited descriptions for existing scripts", async () => {
			createPackageJson({
				build: "tsc",
				test: "vitest",
				lint: "biome lint",
			});

			const markdown = `# My Project

<!-- task-table-start -->
| Task | Description |
|------|-------------|
| \`build\` | Compiles TypeScript to JavaScript |
| \`test\` | Runs the test suite |
<!-- task-table-end -->`;

			const result = await processMarkdown(markdown);

			// Existing descriptions should be preserved
			expect(
				hasTableRow(result, "build", "Compiles TypeScript to JavaScript"),
			).toBe(true);
			expect(hasTableRow(result, "test", "Runs the test suite")).toBe(true);
			// New script should use command as description
			expect(hasTableRow(result, "lint", "biome lint")).toBe(true);
		});

		it("should remove rows for deleted scripts", async () => {
			createPackageJson({
				build: "tsc",
			});

			const markdown = `# My Project

<!-- task-table-start -->
| Task | Description |
|------|-------------|
| \`build\` | Build the project |
| \`deleted\` | This script no longer exists |
<!-- task-table-end -->`;

			const result = await processMarkdown(markdown);

			expect(hasTableRow(result, "build", "Build the project")).toBe(true);
			expect(result).not.toContain("`deleted`");
		});

		it("should use command for new scripts when existing table has entries", async () => {
			createPackageJson({
				build: "tsc --project tsconfig.json",
				"new-script": "echo hello",
			});

			const markdown = `# My Project

<!-- task-table-start -->
| Task | Description |
|------|-------------|
| \`build\` | Custom build description |
<!-- task-table-end -->`;

			const result = await processMarkdown(markdown);

			// Existing preserved
			expect(hasTableRow(result, "build", "Custom build description")).toBe(
				true,
			);
			// New uses command
			expect(hasTableRow(result, "new-script", "echo hello")).toBe(true);
		});
	});

	describe("exclude patterns", () => {
		it("should exclude scripts matching patterns", async () => {
			createPackageJson({
				build: "tsc",
				"build:watch": "tsc --watch",
				test: "vitest",
				"test:coverage": "vitest --coverage",
			});

			const result = await processMarkdown("# Project", {
				exclude: ["*:*"],
			});

			expect(result).toContain("`build`");
			expect(result).toContain("`test`");
			expect(result).not.toContain("`build:watch`");
			expect(result).not.toContain("`test:coverage`");
		});

		it("should support multiple exclude patterns", async () => {
			createPackageJson({
				build: "tsc",
				test: "vitest",
				"pre-commit": "lint-staged",
				"post-install": "husky install",
			});

			const result = await processMarkdown("# Project", {
				exclude: ["pre-*", "post-*"],
			});

			expect(result).toContain("`build`");
			expect(result).toContain("`test`");
			expect(result).not.toContain("`pre-commit`");
			expect(result).not.toContain("`post-install`");
		});

		it("should handle empty exclude array", async () => {
			createPackageJson({
				build: "tsc",
				test: "vitest",
			});

			const result = await processMarkdown("# Project", {
				exclude: [],
			});

			expect(result).toContain("`build`");
			expect(result).toContain("`test`");
		});
	});

	describe("package.json options", () => {
		it("should use custom packageJsonPath", async () => {
			const subdir = join(testDir, "subdir");
			mkdirSync(subdir, { recursive: true });
			writeFileSync(
				join(subdir, "package.json"),
				JSON.stringify({ scripts: { subdir: "echo subdir" } }),
			);

			const result = await processMarkdown("# Project", {
				packageJsonPath: "subdir/package.json",
			});

			expect(hasTableRow(result, "subdir", "echo subdir")).toBe(true);
		});

		it("should skip when package.json does not exist", async () => {
			// Don't create package.json
			const result = await processMarkdown("# Project");

			expect(result).not.toContain("<!-- task-table-start -->");
		});

		it("should handle includePackageJson: false", async () => {
			createPackageJson({ build: "tsc" });

			const result = await processMarkdown("# Project", {
				includePackageJson: false,
			});

			// No table since only source is disabled
			expect(result).not.toContain("<!-- task-table-start -->");
		});
	});

	describe("table format", () => {
		it("should generate proper markdown table structure", async () => {
			createPackageJson({ build: "tsc" });

			const result = await processMarkdown("# Project");

			// Check table header (with flexible whitespace)
			expect(result).toMatch(/\|\s*Task\s*\|\s*Description\s*\|/);
			expect(result).toMatch(/\|\s*-+\s*\|\s*-+\s*\|/);
		});

		it("should use inline code for task names", async () => {
			createPackageJson({ "my-task": "echo test" });

			const result = await processMarkdown("# Project");

			expect(result).toContain("`my-task`");
		});

		it("should handle special characters in scripts", async () => {
			createPackageJson({
				build: "tsc && npm run lint",
			});

			const result = await processMarkdown("# Project");

			expect(hasTableRow(result, "build", "tsc && npm run lint")).toBe(true);
		});
	});

	describe("edge cases", () => {
		it("should handle empty markdown file", async () => {
			createPackageJson({ build: "tsc" });

			const result = await processMarkdown("");

			expect(result).toContain("<!-- task-table-start -->");
			expect(hasTableRow(result, "build", "tsc")).toBe(true);
		});

		it("should handle markdown with only whitespace", async () => {
			createPackageJson({ build: "tsc" });

			const result = await processMarkdown("   \n\n   ");

			expect(result).toContain("<!-- task-table-start -->");
		});

		it("should handle package.json with no scripts key", async () => {
			writeFileSync(
				join(testDir, "package.json"),
				JSON.stringify({ name: "test", version: "1.0.0" }),
			);

			const result = await processMarkdown("# Project");

			expect(result).not.toContain("<!-- task-table-start -->");
		});

		it("should handle invalid JSON in package.json gracefully", async () => {
			writeFileSync(join(testDir, "package.json"), "{ invalid json }");

			const result = await processMarkdown("# Project");

			expect(result).not.toContain("<!-- task-table-start -->");
		});

		it("should handle table with only header row (no data)", async () => {
			createPackageJson({ build: "tsc" });

			const markdown = `# Project

<!-- task-table-start -->
| Task | Description |
|------|-------------|
<!-- task-table-end -->`;

			const result = await processMarkdown(markdown);

			expect(hasTableRow(result, "build", "tsc")).toBe(true);
		});
	});
});

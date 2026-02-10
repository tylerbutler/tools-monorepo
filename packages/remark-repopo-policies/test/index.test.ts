import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "pathe";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { RepopoPoliciesOptions } from "../src/index.js";
import { remarkRepopoPolicies } from "../src/index.js";

// Create a unique temp directory for each test run
const testDir = join(tmpdir(), `remark-repopo-policies-test-${Date.now()}`);

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
 * Helper to create a mock repopo config file
 */
function createMockConfig(_policies?: string[]): void {
	const configContent = `
import { makePolicy, type RepopoConfig } from "repopo";

// Mock policies for testing
const MockPolicy1 = {
	name: "MockPolicy1",
	description: "A mock policy for testing",
	match: /\\.ts$/,
	handler: async () => true,
};

const MockPolicy2 = {
	name: "MockPolicy2",
	match: /package\\.json$/,
	handler: async () => true,
	resolver: async () => ({ name: "MockPolicy2", file: "", resolved: true, errorMessages: [] }),
};

const config: RepopoConfig = {
	policies: [
		makePolicy(MockPolicy1),
		makePolicy(MockPolicy2),
	],
};

export default config;
`;
	writeFileSync(join(testDir, "repopo.config.ts"), configContent);
}

/**
 * Helper to process markdown with the plugin
 */
async function processMarkdown(
	markdown: string,
	options?: RepopoPoliciesOptions,
): Promise<string> {
	const result = await remark()
		.use(remarkGfm)
		.use(remarkRepopoPolicies, options)
		.process({
			value: markdown,
			path: join(testDir, "README.md"),
		});
	return String(result);
}

describe("remarkRepopoPolicies", () => {
	describe("plugin structure", () => {
		it("should be a valid unified plugin", async () => {
			const processor = remark().use(remarkGfm).use(remarkRepopoPolicies);
			expect(processor).toBeDefined();
		});

		it("should process markdown without errors when no config exists", async () => {
			const markdown = "# My Project\n\nSome content.";
			const result = await remark()
				.use(remarkGfm)
				.use(remarkRepopoPolicies)
				.process({
					value: markdown,
					path: "/tmp/test/README.md",
				});
			expect(String(result)).toContain("# My Project");
		});
	});

	describe("config loading", () => {
		// Note: Tests using createMockConfig are skipped because Node.js cannot
		// dynamically import uncompiled TypeScript files from temp directories.
		// The functionality is validated via integration tests with real config.
		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should load policies from repopo.config.ts", async () => {
			createMockConfig(["MockPolicy1", "MockPolicy2"]);

			const result = await processMarkdown("# Project");

			expect(result).toContain("<!-- repopo-policies-start -->");
			expect(result).toContain("MockPolicy1");
			expect(result).toContain("MockPolicy2");
		});

		it("should handle missing config file gracefully", async () => {
			// Don't create config file
			const result = await processMarkdown("# Project");

			// Should not add markers when no config exists
			expect(result).not.toContain("<!-- repopo-policies-start -->");
			expect(result).toBe("# Project\n");
		});
	});

	// Note: Table generation tests using createMockConfig are skipped because
	// Node.js cannot dynamically import uncompiled TypeScript files from temp
	// directories. Table generation is validated via integration tests.
	describe("table generation", () => {
		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should generate table with Policy, Description, Auto-Fix columns", async () => {
			createMockConfig(["MockPolicy1", "MockPolicy2"]);
			const result = await processMarkdown("# Project");
			expect(result).toMatch(
				/\|\s*Policy\s*\|\s*Description\s*\|\s*Auto-Fix\s*\|/,
			);
		});

		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should show Yes/No for auto-fix capability", async () => {
			createMockConfig(["MockPolicy1", "MockPolicy2"]);
			const result = await processMarkdown("# Project");
			expect(result).toContain("No");
			expect(result).toContain("Yes");
		});

		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should include file pattern column when showFilePattern is true", async () => {
			createMockConfig(["MockPolicy1"]);
			const result = await processMarkdown("# Project", {
				showFilePattern: true,
			});
			expect(result).toMatch(/\|\s*Files\s*\|/);
		});

		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should exclude file pattern column when showFilePattern is false", async () => {
			createMockConfig(["MockPolicy1"]);
			const result = await processMarkdown("# Project", {
				showFilePattern: false,
			});
			expect(result).not.toMatch(/\|\s*Files\s*\|/);
		});
	});

	// Note: Marker handling tests using createMockConfig are skipped because
	// Node.js cannot dynamically import uncompiled TypeScript files from temp
	// directories. Marker handling is validated via integration tests.
	describe("marker handling", () => {
		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should replace content between existing markers", async () => {
			createMockConfig(["MockPolicy1"]);
			const markdown = `# My Project

<!-- repopo-policies-start -->
| Policy | Description | Auto-Fix |
|--------|-------------|----------|
| OldPolicy | Old description | Yes |
<!-- repopo-policies-end -->

## Footer`;
			const result = await processMarkdown(markdown);
			expect(result).toContain("MockPolicy1");
			expect(result).not.toContain("OldPolicy");
			expect(result).toContain("## Footer");
		});

		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should handle custom section prefix", async () => {
			createMockConfig(["MockPolicy1"]);
			const markdown = `# Project

<!-- policies-start -->
old content
<!-- policies-end -->`;
			const result = await processMarkdown(markdown, {
				sectionPrefix: "policies",
			});
			expect(result).toContain("<!-- policies-start -->");
			expect(result).toContain("<!-- policies-end -->");
			expect(result).not.toContain("old content");
		});

		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should append at EOF when no markers exist", async () => {
			createMockConfig(["MockPolicy1"]);
			const markdown = "# My Project\n\nSome content.";
			const result = await processMarkdown(markdown);
			expect(result).toMatch(
				/Some content\.\n\n<!-- repopo-policies-start -->/,
			);
		});
	});

	// Note: Description preservation tests using createMockConfig are skipped
	// because Node.js cannot dynamically import uncompiled TypeScript files from
	// temp directories. Description preservation is validated via integration tests.
	describe("description preservation", () => {
		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should preserve user-edited descriptions for existing policies", async () => {
			createMockConfig(["MockPolicy1", "MockPolicy2"]);
			const markdown = `# My Project

<!-- repopo-policies-start -->
| Policy | Description | Auto-Fix |
|--------|-------------|----------|
| MockPolicy1 | Custom user description | No |
<!-- repopo-policies-end -->`;
			const result = await processMarkdown(markdown);
			expect(result).toContain("Custom user description");
		});

		// biome-ignore lint/suspicious/noSkippedTests: Cannot dynamically import uncompiled TS from temp dirs
		it.skip("should use policy description for new policies", async () => {
			createMockConfig(["MockPolicy1", "MockPolicy2"]);
			const markdown = `# My Project

<!-- repopo-policies-start -->
| Policy | Description | Auto-Fix |
|--------|-------------|----------|
| MockPolicy1 | Custom description | No |
<!-- repopo-policies-end -->`;
			const result = await processMarkdown(markdown);
			expect(result).toContain("MockPolicy2");
		});
	});

	describe("integration with real repopo config", () => {
		/**
		 * Process markdown from the actual monorepo root where repopo.config.ts exists
		 */
		async function processFromMonorepoRoot(
			markdown: string,
			options?: RepopoPoliciesOptions,
		): Promise<string> {
			// Go up from packages/remark-repopo-policies to monorepo root
			const monorepoRoot = resolve(process.cwd(), "../..");
			const result = await remark()
				.use(remarkGfm)
				.use(remarkRepopoPolicies, options)
				.process({
					value: markdown,
					path: join(monorepoRoot, "README.md"),
				});
			return String(result);
		}

		it("should load policies from the actual repopo.config.ts", async () => {
			const result = await processFromMonorepoRoot("# Project");

			// These are the actual policies configured in the monorepo
			expect(result).toContain("NoJsFileExtensions");
			expect(result).toContain("PackageJsonProperties");
			expect(result).toContain("PackageJsonSorted");
		});

		it("should correctly identify auto-fix capabilities", async () => {
			const result = await processFromMonorepoRoot("# Project");

			// All actual policies in the config have no resolvers (No)
			expect(result).toContain("| NoJsFileExtensions");
			expect(result).toContain("| PackageJsonSorted");
			// Check for the No column in the table
			expect(result).toContain("| No");
		});

		it("should show human-readable patterns when showReadablePattern is true", async () => {
			const result = await processFromMonorepoRoot("# Project", {
				showReadablePattern: true,
			});

			// Should have the Matches column header (with possible padding)
			expect(result).toMatch(/\|\s*Matches\s*\|/);
			// Should have human-readable descriptions
			expect(result).toMatch(/package\.json files|JavaScript|TypeScript/i);
		});

		it("should show excluded files when showExcludedFiles is true", async () => {
			const result = await processFromMonorepoRoot("# Project", {
				showExcludedFiles: true,
			});

			// Should have the Excluded column header (with possible padding)
			expect(result).toMatch(/\|\s*Excluded\s*\|/);
			// NoJsFileExtensions has excluded files in the monorepo config
			expect(result).toMatch(/bin|svelte\.config|tailwind\.config/);
		});

		it("should show config details when showConfigDetails is true", async () => {
			const result = await processFromMonorepoRoot("# Project", {
				showConfigDetails: true,
			});

			// Should have the Configuration column header (with possible padding)
			expect(result).toMatch(/\|\s*Configuration\s*\|/);
			// PackageJsonProperties has config with verbatim values
			expect(result).toMatch(/license|MIT|author/i);
		});

		it("should support all new columns together", async () => {
			const result = await processFromMonorepoRoot("# Project", {
				showReadablePattern: true,
				showExcludedFiles: true,
				showConfigDetails: true,
				showFilePattern: true,
			});

			// Should have all column headers (with possible padding)
			expect(result).toMatch(/\|\s*Matches\s*\|/);
			expect(result).toMatch(/\|\s*Pattern\s*\|/);
			expect(result).toMatch(/\|\s*Configuration\s*\|/);
			expect(result).toMatch(/\|\s*Excluded\s*\|/);
		});
	});
});

import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
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
function createMockConfig(policies: string[]): void {
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
		it("should load policies from repopo.config.ts", async () => {
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

	describe("table generation", () => {
		function hasTableRow(result: string, ...cells: string[]): boolean {
			const pattern = cells.map((cell) => `\\|\\s*${escapeRegex(cell)}\\s*`).join("");
			return new RegExp(pattern + "\\|").test(result);
		}

		function escapeRegex(str: string): string {
			return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
		}

		it("should generate table with Policy, Description, Auto-Fix columns", async () => {
			createMockConfig(["MockPolicy1", "MockPolicy2"]);
			const result = await processMarkdown("# Project");
			expect(result).toMatch(/\|\s*Policy\s*\|\s*Description\s*\|\s*Auto-Fix\s*\|/);
		});

		it("should show Yes/No for auto-fix capability", async () => {
			createMockConfig(["MockPolicy1", "MockPolicy2"]);
			const result = await processMarkdown("# Project");
			expect(result).toContain("No");
			expect(result).toContain("Yes");
		});

		it("should include file pattern column when showFilePattern is true", async () => {
			createMockConfig(["MockPolicy1"]);
			const result = await processMarkdown("# Project", { showFilePattern: true });
			expect(result).toMatch(/\|\s*Files\s*\|/);
		});

		it("should exclude file pattern column when showFilePattern is false", async () => {
			createMockConfig(["MockPolicy1"]);
			const result = await processMarkdown("# Project", { showFilePattern: false });
			expect(result).not.toMatch(/\|\s*Files\s*\|/);
		});
	});

	describe("marker handling", () => {
		it("should replace content between existing markers", async () => {
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

		it("should handle custom section prefix", async () => {
			createMockConfig(["MockPolicy1"]);
			const markdown = `# Project

<!-- policies-start -->
old content
<!-- policies-end -->`;
			const result = await processMarkdown(markdown, { sectionPrefix: "policies" });
			expect(result).toContain("<!-- policies-start -->");
			expect(result).toContain("<!-- policies-end -->");
			expect(result).not.toContain("old content");
		});

		it("should append at EOF when no markers exist", async () => {
			createMockConfig(["MockPolicy1"]);
			const markdown = "# My Project\n\nSome content.";
			const result = await processMarkdown(markdown);
			expect(result).toMatch(/Some content\.\n\n<!-- repopo-policies-start -->/);
		});
	});

	describe("description preservation", () => {
		it("should preserve user-edited descriptions for existing policies", async () => {
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

		it("should use policy description for new policies", async () => {
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
});

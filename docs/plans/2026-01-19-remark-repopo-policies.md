# remark-repopo-policies Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Create a remark plugin that extracts active repopo policies from a config file and generates a markdown table documenting what each policy enforces.

**Architecture:** The plugin will dynamically import the repopo config file, extract policy instances, and generate a markdown table with policy name, description, auto-fix capability, file match pattern, and configuration summary. Uses the same HTML marker pattern as other remark plugins for idempotent updates.

**Tech Stack:** TypeScript, unified/remark, mdast types, dynamic ES module imports, VFile for file context

---

## Task 1: Scaffold Package Structure

**Files:**
- Create: `packages/remark-repopo-policies/package.json`
- Create: `packages/remark-repopo-policies/tsconfig.json`
- Create: `packages/remark-repopo-policies/vitest.config.ts`
- Create: `packages/remark-repopo-policies/.gitignore`
- Create: `packages/remark-repopo-policies/CHANGELOG.md`
- Create: `packages/remark-repopo-policies/README.md`

**Step 1: Create package.json**

```json
{
	"name": "remark-repopo-policies",
	"version": "0.1.0",
	"description": "Remark plugin to generate documentation tables for repopo repository policies",
	"homepage": "https://github.com/tylerbutler/tools-monorepo/tree/main/packages/remark-repopo-policies#remark-repopo-policies",
	"bugs": "https://github.com/tylerbutler/tools-monorepo/issues",
	"repository": {
		"type": "git",
		"url": "git+https://github.com/tylerbutler/tools-monorepo.git",
		"directory": "packages/remark-repopo-policies"
	},
	"license": "MIT",
	"author": "Tyler Butler <tyler@tylerbutler.com>",
	"type": "module",
	"exports": {
		".": {
			"import": {
				"types": "./esm/index.d.ts",
				"default": "./esm/index.js"
			}
		}
	},
	"types": "./esm/index.d.ts",
	"files": [
		"esm"
	],
	"scripts": {
		"build:compile": "tsc --project ./tsconfig.json",
		"check": "pnpm check:format",
		"check:format": "biome format .",
		"clean": "rimraf esm _temp *.tsbuildinfo *.done.build.log",
		"format": "biome check . --linter-enabled=false --write",
		"lint": "biome lint .",
		"lint:fix": "biome lint . --apply",
		"release:license": "generate-license-file -c ../../.generatelicensefile.cjs",
		"test": "vitest run test",
		"test:coverage": "vitest run test --coverage"
	},
	"dependencies": {
		"mdast-util-to-string": "^4.0.0",
		"pathe": "^2.0.3",
		"unified": "^11.0.5",
		"vfile": "^6.0.3"
	},
	"devDependencies": {
		"@biomejs/biome": "2.3.8",
		"@types/mdast": "^4.0.4",
		"@types/node": "^20.19.25",
		"@vitest/coverage-v8": "^4.0.17",
		"remark": "^15.0.1",
		"remark-gfm": "^4.0.1",
		"remark-parse": "^11.0.0",
		"repopo": "workspace:^",
		"rimraf": "^6.1.2",
		"typescript": "~5.9.3",
		"vitest": "^4.0.17"
	},
	"peerDependencies": {
		"repopo": ">=0.17.0",
		"unified": "^11.0.0"
	},
	"engines": {
		"node": ">=18.0.0"
	},
	"nx": {
		"targets": {
			"build": {
				"executor": "nx:noop"
			},
			"ci": {}
		}
	}
}
```

**Step 2: Create tsconfig.json**

```json
{
	"extends": "../../config/tsconfig.strict.json",
	"include": ["src/**/*"],
	"compilerOptions": {
		"rootDir": "./src",
		"outDir": "./esm",
		"types": ["node"]
	}
}
```

**Step 3: Create vitest.config.ts**

```typescript
import { defineConfig, mergeConfig } from "vitest/config";
import defaultConfig from "../../config/vitest.config";

const config = mergeConfig(defaultConfig, defineConfig({}));
export default config;
```

**Step 4: Create .gitignore**

```
esm/
_temp/
*.tsbuildinfo
*.done.build.log
.coverage/
```

**Step 5: Create CHANGELOG.md**

```markdown
# Changelog

## 0.1.0

- Initial release
- Generate policy documentation tables from repopo config files
- Support for HTML markers for idempotent updates
- Preserve user-edited descriptions
```

**Step 6: Create README.md**

```markdown
# remark-repopo-policies

A [remark](https://github.com/remarkjs/remark) plugin that generates documentation tables for [repopo](https://github.com/tylerbutler/tools-monorepo/tree/main/packages/repopo) repository policies.

## Installation

```bash
npm install remark-repopo-policies
```

## Usage

```typescript
import { remark } from "remark";
import { remarkRepopoPolicies } from "remark-repopo-policies";

const result = await remark()
  .use(remarkRepopoPolicies, {
    configPath: "repopo.config.ts",
  })
  .process(markdown);
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `configPath` | `string` | `"repopo.config.ts"` | Path to repopo config file relative to markdown file |
| `sectionPrefix` | `string` | `"repopo-policies"` | Prefix for HTML markers |
| `showConfig` | `boolean` | `false` | Show policy configuration details |
| `showFilePattern` | `boolean` | `true` | Show file match patterns |

## Markers

The plugin looks for HTML comment markers in your markdown:

```markdown
<!-- repopo-policies-start -->
(table will be generated here)
<!-- repopo-policies-end -->
```

If no markers exist, the table is appended at the end of the file.

## Generated Table

The plugin generates a table with the following columns:

| Policy | Description | Auto-Fix | Files |
|--------|-------------|----------|-------|
| NoJsFileExtensions | Prevents ambiguous .js files | No | `*.js` |

User-edited descriptions are preserved across regenerations.

## License

MIT
```

**Step 7: Run pnpm install to link package**

Run: `pnpm install`
Expected: Package linked into workspace

**Step 8: Commit scaffold**

```bash
git add packages/remark-repopo-policies/
git commit -m "feat(remark-repopo-policies): scaffold package structure"
```

---

## Task 2: Write Failing Test for Basic Plugin Structure

**Files:**
- Create: `packages/remark-repopo-policies/test/index.test.ts`

**Step 1: Write failing test for plugin export**

```typescript
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import { describe, expect, it } from "vitest";
import { remarkRepopoPolicies } from "../src/index.js";

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
});
```

**Step 2: Run test to verify it fails**

Run: `cd packages/remark-repopo-policies && pnpm vitest run test/index.test.ts`
Expected: FAIL with "Cannot find module '../src/index.js'"

**Step 3: Commit failing test**

```bash
git add packages/remark-repopo-policies/test/
git commit -m "test(remark-repopo-policies): add failing tests for plugin structure"
```

---

## Task 3: Implement Minimal Plugin Structure

**Files:**
- Create: `packages/remark-repopo-policies/src/index.ts`

**Step 1: Write minimal implementation**

```typescript
import type { Root } from "mdast";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

/**
 * Options for the remark-repopo-policies plugin
 */
export interface RepopoPoliciesOptions {
	/**
	 * Path to repopo config file relative to the markdown file's directory.
	 * @default "repopo.config.ts"
	 */
	configPath?: string;

	/**
	 * Prefix for section markers.
	 * Results in `<!-- {prefix}-start -->` and `<!-- {prefix}-end -->`
	 * @default "repopo-policies"
	 */
	sectionPrefix?: string;

	/**
	 * Whether to show policy configuration details in the table.
	 * @default false
	 */
	showConfig?: boolean;

	/**
	 * Whether to show file match patterns in the table.
	 * @default true
	 */
	showFilePattern?: boolean;
}

/**
 * Remark plugin to generate documentation tables for repopo repository policies.
 *
 * The plugin looks for HTML comment markers (`<!-- repopo-policies-start -->` and
 * `<!-- repopo-policies-end -->`) in the markdown and replaces the content between
 * them with an updated table.
 *
 * If no markers exist, the table is appended at the end of the file with markers.
 *
 * User-edited descriptions in the Description column are preserved across updates.
 *
 * @example
 * ```typescript
 * import { remark } from "remark";
 * import { remarkRepopoPolicies } from "remark-repopo-policies";
 *
 * const result = await remark()
 *   .use(remarkRepopoPolicies, { configPath: "repopo.config.ts" })
 *   .process(markdown);
 * ```
 */
export const remarkRepopoPolicies: Plugin<[RepopoPoliciesOptions?], Root> = (
	options,
) => {
	const {
		configPath = "repopo.config.ts",
		sectionPrefix = "repopo-policies",
		showConfig = false,
		showFilePattern = true,
	} = options ?? {};

	return (tree: Root, file: VFile) => {
		// Minimal implementation - just return without modification
		// Full implementation will come in subsequent tasks
	};
};
```

**Step 2: Run test to verify it passes**

Run: `cd packages/remark-repopo-policies && pnpm vitest run test/index.test.ts`
Expected: PASS

**Step 3: Commit minimal implementation**

```bash
git add packages/remark-repopo-policies/src/
git commit -m "feat(remark-repopo-policies): implement minimal plugin structure"
```

---

## Task 4: Write Failing Test for Config Loading

**Files:**
- Modify: `packages/remark-repopo-policies/test/index.test.ts`

**Step 1: Add test for config loading**

Add to the test file after the existing tests:

```typescript
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "pathe";
import { afterEach, beforeEach } from "vitest";

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
```

**Step 2: Run test to verify it fails**

Run: `cd packages/remark-repopo-policies && pnpm vitest run test/index.test.ts`
Expected: FAIL - "should load policies from repopo.config.ts" fails because plugin doesn't load config yet

**Step 3: Commit failing test**

```bash
git add packages/remark-repopo-policies/test/
git commit -m "test(remark-repopo-policies): add failing tests for config loading"
```

---

## Task 5: Implement Config Loading

**Files:**
- Modify: `packages/remark-repopo-policies/src/index.ts`

**Step 1: Add config loading implementation**

Update `src/index.ts` to load and parse the repopo config:

```typescript
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import type { Html, Root, Table, TableCell, TableRow, Text } from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import { dirname, resolve } from "pathe";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

/**
 * Represents extracted policy information for documentation
 */
interface PolicyInfo {
	/** Policy name */
	name: string;
	/** Policy description */
	description: string;
	/** Whether the policy has auto-fix capability */
	hasAutoFix: boolean;
	/** File match pattern as string */
	filePattern: string;
	/** Configuration summary (if any) */
	configSummary?: string;
}

/**
 * Options for the remark-repopo-policies plugin
 */
export interface RepopoPoliciesOptions {
	/**
	 * Path to repopo config file relative to the markdown file's directory.
	 * @default "repopo.config.ts"
	 */
	configPath?: string;

	/**
	 * Prefix for section markers.
	 * Results in `<!-- {prefix}-start -->` and `<!-- {prefix}-end -->`
	 * @default "repopo-policies"
	 */
	sectionPrefix?: string;

	/**
	 * Whether to show policy configuration details in the table.
	 * @default false
	 */
	showConfig?: boolean;

	/**
	 * Whether to show file match patterns in the table.
	 * @default true
	 */
	showFilePattern?: boolean;
}

/**
 * Load the repopo config file and extract policy information
 */
async function loadPolicies(configPath: string): Promise<PolicyInfo[]> {
	if (!existsSync(configPath)) {
		return [];
	}

	try {
		// Dynamic import requires file:// URL for absolute paths
		const configUrl = pathToFileURL(configPath).href;
		const configModule = await import(configUrl);
		const config = configModule.default;

		if (!config?.policies || !Array.isArray(config.policies)) {
			return [];
		}

		const policies: PolicyInfo[] = [];

		for (const policy of config.policies) {
			policies.push({
				name: policy.name ?? "Unknown",
				description: policy.description ?? "",
				hasAutoFix: policy.resolver !== undefined,
				filePattern: policy.match?.source ?? "*",
				configSummary: policy.config ? summarizeConfig(policy.config) : undefined,
			});
		}

		return policies;
	} catch (error) {
		// Config loading failed - return empty array
		return [];
	}
}

/**
 * Create a brief summary of policy configuration
 */
function summarizeConfig(config: unknown): string {
	if (config === undefined || config === null) {
		return "";
	}
	if (typeof config === "object") {
		const keys = Object.keys(config);
		if (keys.length === 0) {
			return "";
		}
		return keys.join(", ");
	}
	return String(config);
}

/**
 * Find the indices of start and end markers in the AST
 */
function findMarkers(
	tree: Root,
	prefix: string,
): {
	startIndex: number | null;
	endIndex: number | null;
} {
	const startMarker = `<!-- ${prefix}-start -->`;
	const endMarker = `<!-- ${prefix}-end -->`;

	let startIndex: number | null = null;
	let endIndex: number | null = null;

	for (let i = 0; i < tree.children.length; i++) {
		const node = tree.children[i];
		if (node !== undefined && node.type === "html") {
			const value = node.value.trim();
			if (value === startMarker) {
				startIndex = i;
			} else if (value === endMarker) {
				endIndex = i;
			}
		}
	}

	return { startIndex, endIndex };
}

/**
 * Extract name and description from a table row
 */
function extractRowData(
	row: TableRow,
): { name: string; description: string } | undefined {
	if (row.children.length < 2) {
		return undefined;
	}

	const nameCell = row.children[0];
	const descCell = row.children[1];

	if (nameCell === undefined || descCell === undefined) {
		return undefined;
	}

	const name = mdastToString(nameCell).trim();
	const description = mdastToString(descCell).trim();

	if (!name) {
		return undefined;
	}

	return { name, description };
}

/**
 * Parse an existing table to extract name -> description mapping
 */
function parseExistingTable(
	tree: Root,
	startIndex: number,
	endIndex: number,
): Map<string, string> {
	const descriptions = new Map<string, string>();

	for (let i = startIndex + 1; i < endIndex; i++) {
		const node = tree.children[i];
		if (node?.type === "table") {
			const tableNode = node as Table;
			// Skip header row (index 0), process data rows
			for (let rowIdx = 1; rowIdx < tableNode.children.length; rowIdx++) {
				const row = tableNode.children[rowIdx];
				if (row !== undefined) {
					const data = extractRowData(row);
					if (data) {
						descriptions.set(data.name, data.description);
					}
				}
			}
			break;
		}
	}

	return descriptions;
}

/**
 * Create a table cell with text content
 */
function createTextCell(text: string): TableCell {
	return {
		type: "tableCell",
		children: [{ type: "text", value: text } as Text],
	};
}

/**
 * Generate a table AST from policy entries
 */
function generateTableAst(
	policies: PolicyInfo[],
	existingDescriptions: Map<string, string>,
	options: { showFilePattern: boolean; showConfig: boolean },
): Table {
	const headerCells = [createTextCell("Policy"), createTextCell("Description"), createTextCell("Auto-Fix")];
	if (options.showFilePattern) {
		headerCells.push(createTextCell("Files"));
	}
	if (options.showConfig) {
		headerCells.push(createTextCell("Config"));
	}

	const headerRow: TableRow = {
		type: "tableRow",
		children: headerCells,
	};

	const dataRows: TableRow[] = policies.map((policy) => {
		// Preserve existing description if present, otherwise use policy description
		const description =
			existingDescriptions.get(policy.name) || policy.description || "(no description)";

		const cells = [
			createTextCell(policy.name),
			createTextCell(description),
			createTextCell(policy.hasAutoFix ? "Yes" : "No"),
		];

		if (options.showFilePattern) {
			cells.push(createTextCell(`\`${policy.filePattern}\``));
		}

		if (options.showConfig && policy.configSummary) {
			cells.push(createTextCell(policy.configSummary));
		} else if (options.showConfig) {
			cells.push(createTextCell("-"));
		}

		return {
			type: "tableRow",
			children: cells,
		};
	});

	const align: (null | "left" | "right" | "center")[] = [null, null, null];
	if (options.showFilePattern) align.push(null);
	if (options.showConfig) align.push(null);

	return {
		type: "table",
		align,
		children: [headerRow, ...dataRows],
	};
}

/**
 * Update the AST with the new table content
 */
function updateAst(
	tree: Root,
	table: Table,
	prefix: string,
	startIndex: number | null,
	endIndex: number | null,
): void {
	const startMarkerNode: Html = {
		type: "html",
		value: `<!-- ${prefix}-start -->`,
	};
	const endMarkerNode: Html = {
		type: "html",
		value: `<!-- ${prefix}-end -->`,
	};

	if (startIndex !== null && endIndex !== null && startIndex < endIndex) {
		// Replace content between markers
		tree.children.splice(
			startIndex,
			endIndex - startIndex + 1,
			startMarkerNode,
			table,
			endMarkerNode,
		);
	} else {
		// Append at end of file
		tree.children.push(startMarkerNode, table, endMarkerNode);
	}
}

/**
 * Remark plugin to generate documentation tables for repopo repository policies.
 */
export const remarkRepopoPolicies: Plugin<[RepopoPoliciesOptions?], Root> = (
	options,
) => {
	const {
		configPath = "repopo.config.ts",
		sectionPrefix = "repopo-policies",
		showConfig = false,
		showFilePattern = true,
	} = options ?? {};

	return async (tree: Root, file: VFile) => {
		// Get the directory of the markdown file
		const filePath = file.history?.[0] || file.path;
		if (!filePath) {
			file.message("No file path available, skipping policy table generation");
			return;
		}

		const dir = dirname(filePath);
		const fullConfigPath = resolve(dir, configPath);

		// Load policies from config
		const policies = await loadPolicies(fullConfigPath);

		// If no policies, don't create/update table
		if (policies.length === 0) {
			return;
		}

		// Find existing markers
		const { startIndex, endIndex } = findMarkers(tree, sectionPrefix);

		// Parse existing table for description preservation
		let existingDescriptions = new Map<string, string>();
		if (startIndex !== null && endIndex !== null && startIndex < endIndex) {
			existingDescriptions = parseExistingTable(tree, startIndex, endIndex);
		}

		// Generate new table
		const table = generateTableAst(policies, existingDescriptions, {
			showFilePattern,
			showConfig,
		});

		// Update AST
		updateAst(tree, table, sectionPrefix, startIndex, endIndex);
	};
};
```

**Step 2: Run test to verify it passes**

Run: `cd packages/remark-repopo-policies && pnpm vitest run test/index.test.ts`
Expected: Tests may still fail due to dynamic import issues with TypeScript config files

**Step 3: Commit implementation**

```bash
git add packages/remark-repopo-policies/src/
git commit -m "feat(remark-repopo-policies): implement config loading and table generation"
```

---

## Task 6: Write Failing Tests for Table Generation Features

**Files:**
- Modify: `packages/remark-repopo-policies/test/index.test.ts`

**Step 1: Add comprehensive table tests**

Add to the test file:

```typescript
describe("table generation", () => {
	/**
	 * Helper to check if a table row exists with the given values
	 */
	function hasTableRow(result: string, ...cells: string[]): boolean {
		// Build a pattern that matches cells in order with flexible whitespace
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

		// MockPolicy1 has no resolver (No), MockPolicy2 has resolver (Yes)
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

		// MockPolicy2 should use its built-in description or "(no description)"
		expect(result).toContain("MockPolicy2");
	});
});
```

**Step 2: Run tests**

Run: `cd packages/remark-repopo-policies && pnpm vitest run test/index.test.ts`

**Step 3: Commit tests**

```bash
git add packages/remark-repopo-policies/test/
git commit -m "test(remark-repopo-policies): add comprehensive table generation tests"
```

---

## Task 7: Integration Test with Real Repopo Config

**Files:**
- Modify: `packages/remark-repopo-policies/test/index.test.ts`

**Step 1: Add integration test using the actual monorepo config**

Add to the test file:

```typescript
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

		// NoJsFileExtensions has no resolver (No)
		// PackageJsonSorted has a resolver (Yes)
		expect(result).toContain("| NoJsFileExtensions");
		expect(result).toContain("| No |");
		expect(result).toContain("| Yes |");
	});
});
```

**Step 2: Run integration tests**

Run: `cd packages/remark-repopo-policies && pnpm vitest run test/index.test.ts`

**Step 3: Commit integration tests**

```bash
git add packages/remark-repopo-policies/test/
git commit -m "test(remark-repopo-policies): add integration tests with real config"
```

---

## Task 8: Add CLAUDE.md Documentation

**Files:**
- Create: `packages/remark-repopo-policies/CLAUDE.md`

**Step 1: Create package-specific guidance**

```markdown
# CLAUDE.md - remark-repopo-policies

Package-specific guidance for the repopo policies remark plugin.

## Package Overview

Remark plugin that generates documentation tables for repopo repository policies. Reads the `repopo.config.ts` file and outputs a markdown table showing each active policy, its description, auto-fix capability, and file match pattern.

## Core Architecture

### Plugin Flow

1. Resolve config file path relative to markdown file
2. Dynamically import the repopo config (TypeScript/ESM)
3. Extract policy instances from `config.policies` array
4. Parse existing table (if markers present) to preserve descriptions
5. Generate new table AST with policy information
6. Update markdown AST (replace between markers or append)

### Key Types

```typescript
interface PolicyInfo {
  name: string;          // Policy name from PolicyDefinition
  description: string;   // From policy or user-edited
  hasAutoFix: boolean;   // true if resolver is defined
  filePattern: string;   // RegExp.source from match
  configSummary?: string; // Brief config summary
}
```

### Options

| Option | Type | Default | Purpose |
|--------|------|---------|---------|
| `configPath` | `string` | `"repopo.config.ts"` | Config file location |
| `sectionPrefix` | `string` | `"repopo-policies"` | HTML marker prefix |
| `showConfig` | `boolean` | `false` | Show config column |
| `showFilePattern` | `boolean` | `true` | Show files column |

## Development Commands

```bash
# Run tests
pnpm test

# Run specific test
pnpm vitest run test/index.test.ts

# Build
pnpm build:compile

# Format
pnpm format
```

## Testing Strategy

- **Unit tests**: Mock config files in temp directories
- **Integration tests**: Use actual monorepo `repopo.config.ts`
- **Description preservation**: Verify user edits survive regeneration

## Key Dependencies

- `unified` / `vfile` - Remark plugin infrastructure
- `mdast-util-to-string` - Extract text from AST nodes
- `pathe` - Cross-platform path handling
- `repopo` - Peer dependency for types

## Common Patterns

### Dynamic Config Import

```typescript
const configUrl = pathToFileURL(configPath).href;
const configModule = await import(configUrl);
const config = configModule.default;
```

### HTML Marker Detection

```typescript
function findMarkers(tree: Root, prefix: string) {
  const startMarker = `<!-- ${prefix}-start -->`;
  const endMarker = `<!-- ${prefix}-end -->`;
  // Find indices in tree.children...
}
```

### Description Preservation

Parse existing table before generating new one:
```typescript
const existingDescriptions = parseExistingTable(tree, startIndex, endIndex);
// Use existingDescriptions.get(policyName) || policy.description
```
```

**Step 2: Commit documentation**

```bash
git add packages/remark-repopo-policies/CLAUDE.md
git commit -m "docs(remark-repopo-policies): add package-specific CLAUDE.md guidance"
```

---

## Task 9: Build and Verify

**Files:**
- None (verification only)

**Step 1: Build the package**

Run: `pnpm nx run remark-repopo-policies:build`
Expected: Build succeeds

**Step 2: Run all tests**

Run: `pnpm nx run remark-repopo-policies:test`
Expected: All tests pass

**Step 3: Run checks**

Run: `pnpm nx run remark-repopo-policies:check`
Expected: Format and lint pass

**Step 4: Verify policy compliance**

Run: `./packages/repopo/bin/dev.js check --path packages/remark-repopo-policies`
Expected: All policies pass

---

## Task 10: Final Commit and Documentation Update

**Files:**
- Modify: `packages/remark-repopo-policies/README.md` (if needed for accuracy)

**Step 1: Run full CI check**

Run: `pnpm nx run remark-repopo-policies:ci`
Expected: All CI tasks pass

**Step 2: Final commit**

```bash
git add -A
git commit -m "feat(remark-repopo-policies): complete initial implementation

- Generate markdown tables from repopo config files
- Support HTML markers for idempotent updates
- Preserve user-edited descriptions across regenerations
- Show policy name, description, auto-fix capability, file patterns
- Configurable columns via options
- Full test coverage with unit and integration tests"
```

---

## Summary

This plan creates a new `remark-repopo-policies` package following the established patterns in the monorepo:

1. **Package scaffold** - Standard structure matching `remark-task-table`
2. **TDD approach** - Failing tests before implementation
3. **Config loading** - Dynamic ESM import of repopo config
4. **Table generation** - MDAST-based table building
5. **Marker handling** - HTML comments for idempotent updates
6. **Description preservation** - Keep user edits across regenerations
7. **Integration tests** - Verify against real monorepo config
8. **Documentation** - README and CLAUDE.md for guidance

The plugin will enable automatic documentation of repository policies in markdown files, keeping policy documentation in sync with actual configuration.

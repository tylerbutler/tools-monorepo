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
	/** Human-readable description of what files match */
	filePatternReadable: string;
	/** Configuration summary (if any) */
	configSummary: string | undefined;
	/** Detailed config for display */
	configDetails: string | undefined;
	/** Excluded file patterns */
	excludedFiles: string[];
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

	/**
	 * Whether to show human-readable descriptions of file patterns.
	 * @default false
	 */
	showReadablePattern?: boolean;

	/**
	 * Whether to show excluded file patterns.
	 * @default false
	 */
	showExcludedFiles?: boolean;

	/**
	 * Whether to show detailed configuration values instead of just keys.
	 * @default false
	 */
	showConfigDetails?: boolean;
}

/**
 * Regex pattern mappings for human-readable descriptions
 * Defined at top-level for performance (biome lint/performance/useTopLevelRegex)
 */
const PATTERN_MAPPINGS: [RegExp, string][] = [
	[/^package\.json\$$/, "package.json files"],
	[/^\^?package\.json\$$/, "package.json files"],
	[/^tsconfig.*\.json\$$/, "tsconfig JSON files"],
	[/^\^?tsconfig.*\.json\$$/, "tsconfig JSON files"],
	[/^\.\[jt\]sx\?\$$/, "JavaScript/TypeScript files"],
	[/^\.tsx\?\$$/, "TypeScript files"],
	[/^\.jsx\?\$$/, "JavaScript files"],
	[/^\.ts\$$/, "TypeScript files (.ts)"],
	[/^\.js\$$/, "JavaScript files (.js)"],
	[/^\.mjs\$$/, "ES modules (.mjs)"],
	[/^\.cjs\$$/, "CommonJS files (.cjs)"],
	[/^\.json\$$/, "JSON files"],
	[/^\.ya?ml\$$/, "YAML files"],
	[/^\.html\$$/, "HTML files"],
	[/^\.css\$$/, "CSS files"],
	[/^\.md\$$/, "Markdown files"],
];

/**
 * Convert a regex pattern to a human-readable description
 */
function regexToReadable(pattern: string): string {
	for (const [regex, readable] of PATTERN_MAPPINGS) {
		if (regex.test(pattern)) {
			return readable;
		}
	}

	// Try to derive a description from the pattern
	if (pattern.includes("package.json")) {
		return "package.json files";
	}
	if (pattern.includes("tsconfig") && pattern.includes(".json")) {
		return "tsconfig files";
	}
	if (pattern.includes(".ts") || pattern.includes(".js")) {
		if (pattern.includes("[jt]s")) {
			return "JavaScript/TypeScript files";
		}
		if (pattern.includes(".ts")) {
			return "TypeScript files";
		}
		return "JavaScript files";
	}
	if (pattern.includes(".json")) {
		return "JSON files";
	}
	if (pattern.includes(".html")) {
		return "HTML files";
	}
	if (pattern.includes(".md")) {
		return "Markdown files";
	}

	// For complex patterns, return a simplified version
	return pattern
		.replace(/\\\./g, ".")
		.replace(/\$$/g, "")
		.replace(/^\^/g, "")
		.replace(/\?/g, "")
		.replace(/\+/g, "");
}

/**
 * Format config details for display
 */
function formatConfigDetails(config: unknown): string {
	if (config === undefined || config === null) {
		return "";
	}
	if (typeof config !== "object") {
		return String(config);
	}

	try {
		const formatted = JSON.stringify(config, null, 2);
		// Truncate if too long
		if (formatted.length > 200) {
			return `${formatted.slice(0, 197)}...`;
		}
		return formatted;
	} catch {
		return String(config);
	}
}

/**
 * Format excluded files for display
 */
function formatExcludedFiles(excludeFiles: unknown): string[] {
	if (!(excludeFiles && Array.isArray(excludeFiles))) {
		return [];
	}
	return excludeFiles.map((pattern) => {
		if (pattern instanceof RegExp) {
			return pattern.source;
		}
		return String(pattern);
	});
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

		if (!(config?.policies && Array.isArray(config.policies))) {
			return [];
		}

		const policies: PolicyInfo[] = [];

		for (const policy of config.policies) {
			const pattern = policy.match?.source ?? "*";
			policies.push({
				name: policy.name ?? "Unknown",
				description: policy.description ?? "",
				hasAutoFix: policy.resolver !== undefined,
				filePattern: pattern,
				filePatternReadable: regexToReadable(pattern),
				configSummary: policy.config
					? summarizeConfig(policy.config)
					: undefined,
				configDetails: policy.config
					? formatConfigDetails(policy.config)
					: undefined,
				excludedFiles: formatExcludedFiles(policy.excludeFiles),
			});
		}

		return policies;
	} catch (_error) {
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
 * Options for table generation
 */
interface TableGenOptions {
	showFilePattern: boolean;
	showReadablePattern: boolean;
	showConfig: boolean;
	showConfigDetails: boolean;
	showExcludedFiles: boolean;
}

/**
 * Build header cells based on options
 */
function buildHeaderCells(options: TableGenOptions): TableCell[] {
	const cells = [
		createTextCell("Policy"),
		createTextCell("Description"),
		createTextCell("Auto-Fix"),
	];
	if (options.showReadablePattern) {
		cells.push(createTextCell("Matches"));
	}
	if (options.showFilePattern) {
		cells.push(createTextCell("Pattern"));
	}
	if (options.showConfigDetails) {
		cells.push(createTextCell("Configuration"));
	} else if (options.showConfig) {
		cells.push(createTextCell("Config"));
	}
	if (options.showExcludedFiles) {
		cells.push(createTextCell("Excluded"));
	}
	return cells;
}

/**
 * Build optional cells for a policy row
 */
function buildOptionalCells(
	policy: PolicyInfo,
	options: TableGenOptions,
): TableCell[] {
	const cells: TableCell[] = [];

	if (options.showReadablePattern) {
		cells.push(createTextCell(policy.filePatternReadable));
	}

	if (options.showFilePattern) {
		cells.push(createTextCell(`\`${policy.filePattern}\``));
	}

	if (options.showConfigDetails) {
		const content = policy.configDetails ? `\`${policy.configDetails}\`` : "-";
		cells.push(createTextCell(content));
	} else if (options.showConfig) {
		cells.push(createTextCell(policy.configSummary ?? "-"));
	}

	if (options.showExcludedFiles) {
		const content =
			policy.excludedFiles.length > 0
				? policy.excludedFiles.map((f) => `\`${f}\``).join(", ")
				: "-";
		cells.push(createTextCell(content));
	}

	return cells;
}

/**
 * Count the number of columns based on options
 */
function countColumns(options: TableGenOptions): number {
	let count = 3; // Policy, Description, Auto-Fix
	if (options.showReadablePattern) {
		count++;
	}
	if (options.showFilePattern) {
		count++;
	}
	if (options.showConfigDetails || options.showConfig) {
		count++;
	}
	if (options.showExcludedFiles) {
		count++;
	}
	return count;
}

/**
 * Generate a table AST from policy entries
 */
function generateTableAst(
	policies: PolicyInfo[],
	existingDescriptions: Map<string, string>,
	options: TableGenOptions,
): Table {
	const headerRow: TableRow = {
		type: "tableRow",
		children: buildHeaderCells(options),
	};

	const dataRows: TableRow[] = policies.map((policy) => {
		const description =
			existingDescriptions.get(policy.name) ||
			policy.description ||
			"(no description)";

		const baseCells = [
			createTextCell(policy.name),
			createTextCell(description),
			createTextCell(policy.hasAutoFix ? "Yes" : "No"),
		];

		return {
			type: "tableRow",
			children: [...baseCells, ...buildOptionalCells(policy, options)],
		};
	});

	const columnCount = countColumns(options);
	const align = Array.from<null>({ length: columnCount }).fill(null);

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
		showReadablePattern = false,
		showExcludedFiles = false,
		showConfigDetails = false,
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
			showReadablePattern,
			showConfig,
			showConfigDetails,
			showExcludedFiles,
		});

		// Update AST
		updateAst(tree, table, sectionPrefix, startIndex, endIndex);
	};
};

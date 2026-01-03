import { existsSync, readFileSync } from "node:fs";
import type {
	Html,
	InlineCode,
	Link,
	Root,
	Table,
	TableCell,
	TableRow,
	Text,
} from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import micromatch from "micromatch";
import { dirname, join } from "pathe";
import resolveWorkspacePkg from "resolve-workspace-root";
import { globSync } from "tinyglobby";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

const { getWorkspaceGlobs, resolveWorkspaceRoot } = resolveWorkspacePkg;

/**
 * Regex for removing leading slash from relative paths
 */
const LEADING_SLASH_REGEX = /^\//;

/**
 * Represents a package entry discovered from the workspace
 */
export interface PackageEntry {
	/** Package name from package.json */
	name: string;
	/** Package description from package.json */
	description: string;
	/** Relative path to the package directory */
	path: string;
	/** Whether the package is private */
	private: boolean;
}

/**
 * Options for the remark-workspace-packages plugin
 */
export interface WorkspacePackagesOptions {
	/**
	 * Path to the workspace root relative to the markdown file's directory.
	 * If not specified, the plugin will search upward for pnpm-workspace.yaml or package.json with workspaces.
	 * @default undefined (auto-detect)
	 */
	workspaceRoot?: string;

	/**
	 * Prefix for section markers.
	 * Results in `<!-- {prefix}-start -->` and `<!-- {prefix}-end -->`
	 * @default "workspace-packages"
	 */
	sectionPrefix?: string;

	/**
	 * Glob patterns to exclude packages from the table.
	 * Matches against package names.
	 * @default []
	 */
	exclude?: string[];

	/**
	 * Glob patterns to include packages in the table.
	 * If specified, only matching packages are included.
	 * @default [] (include all)
	 */
	include?: string[];

	/**
	 * Whether to include private packages.
	 * @default true
	 */
	includePrivate?: boolean;

	/**
	 * Whether to include a link to the package directory.
	 * @default true
	 */
	includeLinks?: boolean;

	/**
	 * Column configuration for the table.
	 * Use "private" column to show package privacy status (✓ for private, empty for public).
	 * @default ["name", "description"]
	 */
	columns?: Array<"name" | "description" | "path" | "private">;

	/**
	 * Custom column headers.
	 * @default { name: "Package", description: "Description", path: "Path", private: "Private" }
	 */
	columnHeaders?: {
		name?: string;
		description?: string;
		path?: string;
		private?: string;
	};
}

/**
 * Package.json structure for reading workspace packages
 */
interface PackageJson {
	name?: string;
	description?: string;
	private?: boolean;
	workspaces?: string[] | { packages: string[] };
}

/**
 * Check if a name matches any exclude pattern
 */
function isExcluded(name: string, patterns: string[]): boolean {
	if (patterns.length === 0) {
		return false;
	}
	return micromatch.isMatch(name, patterns);
}

/**
 * Check if a name matches any include pattern (or no patterns means include all)
 */
function isIncluded(name: string, patterns: string[]): boolean {
	if (patterns.length === 0) {
		return true;
	}
	return micromatch.isMatch(name, patterns);
}

/**
 * Expand workspace glob patterns to find package directories containing package.json
 */
function expandWorkspacePatterns(
	workspaceRoot: string,
	patterns: string[],
): string[] {
	// Convert workspace patterns to glob patterns for package.json files
	const globPatterns = patterns
		.filter((p) => !p.startsWith("!"))
		.map((p) => join(p, "package.json"));

	// Find all matching package.json files
	const packageJsonPaths = globSync(globPatterns, {
		cwd: workspaceRoot,
		absolute: true,
		ignore: ["**/node_modules/**"],
	});

	// Return the directory containing each package.json
	return packageJsonPaths.map((p) => dirname(p));
}

/**
 * Read package information from a package directory
 */
function readPackageInfo(
	packageDir: string,
	workspaceRoot: string,
): PackageEntry | undefined {
	const pkgJsonPath = join(packageDir, "package.json");
	if (!existsSync(pkgJsonPath)) {
		return undefined;
	}

	try {
		const content = readFileSync(pkgJsonPath, "utf-8");
		const pkg = JSON.parse(content) as PackageJson;

		if (!pkg.name) {
			return undefined;
		}

		// Calculate relative path from workspace root
		const relativePath = packageDir
			.replace(workspaceRoot, "")
			.replace(LEADING_SLASH_REGEX, "");

		return {
			name: pkg.name,
			description: pkg.description || "",
			path: relativePath,
			private: pkg.private === true,
		};
	} catch {
		return undefined;
	}
}

/**
 * Extract workspace packages
 */
function extractWorkspacePackages(
	workspaceRoot: string,
	options: {
		exclude: string[];
		include: string[];
		includePrivate: boolean;
	},
): PackageEntry[] {
	const patterns = getWorkspaceGlobs(workspaceRoot);
	if (patterns === null || patterns.length === 0) {
		return [];
	}

	const packageDirs = expandWorkspacePatterns(workspaceRoot, patterns);
	const packages: PackageEntry[] = [];

	for (const dir of packageDirs) {
		const pkg = readPackageInfo(dir, workspaceRoot);
		if (!pkg) {
			continue;
		}

		// Apply filters
		if (!options.includePrivate && pkg.private) {
			continue;
		}
		if (isExcluded(pkg.name, options.exclude)) {
			continue;
		}
		if (!isIncluded(pkg.name, options.include)) {
			continue;
		}

		packages.push(pkg);
	}

	// Sort alphabetically by name
	return packages.sort((a, b) => a.name.localeCompare(b.name));
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

	// Remove backticks and link syntax from inline code/links
	const cleanName = name.replace(/^`|`$/g, "").replace(/^\[|\].*$/g, "");
	return { name: cleanName, description };
}

/**
 * Parse an existing table to extract name → description mapping
 */
function parseExistingTable(
	tree: Root,
	startIndex: number,
	endIndex: number,
): Map<string, string> {
	const descriptions = new Map<string, string>();

	// Find table node between markers
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
 * Create a table cell with inline code content
 */
function createCodeCell(code: string): TableCell {
	return {
		type: "tableCell",
		children: [{ type: "inlineCode", value: code } as InlineCode],
	};
}

/**
 * Create a table cell with a link
 */
function createLinkCell(text: string, url: string): TableCell {
	return {
		type: "tableCell",
		children: [
			{
				type: "link",
				url,
				children: [{ type: "inlineCode", value: text } as InlineCode],
			} as Link,
		],
	};
}

/**
 * Normalize column order: if "private" is present, move it to second position (after "name")
 */
function normalizeColumnOrder(
	columns: Array<"name" | "description" | "path" | "private">,
): Array<"name" | "description" | "path" | "private"> {
	const privateIndex = columns.indexOf("private");
	if (privateIndex === -1 || privateIndex === 1) {
		// No private column or already in second position
		return columns;
	}

	// Remove private from current position and insert at index 1 (second position)
	const result: Array<"name" | "description" | "path" | "private"> =
		columns.filter((col) => col !== "private");
	result.splice(1, 0, "private");
	return result;
}

/**
 * Generate a new table AST from package entries
 */
function generateTableAst(
	entries: PackageEntry[],
	existingDescriptions: Map<string, string>,
	options: {
		columns: Array<"name" | "description" | "path" | "private">;
		columnHeaders: {
			name: string;
			description: string;
			path: string;
			private: string;
		};
		includeLinks: boolean;
	},
): Table {
	// Normalize column order: private should be second if present
	const columns = normalizeColumnOrder(options.columns);

	const headerCells: TableCell[] = columns.map((col) =>
		createTextCell(options.columnHeaders[col]),
	);

	const headerRow: TableRow = {
		type: "tableRow",
		children: headerCells,
	};

	const dataRows: TableRow[] = entries.map((entry) => {
		const cells: TableCell[] = [];

		for (const col of columns) {
			switch (col) {
				case "name":
					if (options.includeLinks) {
						cells.push(createLinkCell(entry.name, `./${entry.path}`));
					} else {
						cells.push(createCodeCell(entry.name));
					}
					break;
				case "description": {
					// Preserve existing description if present, otherwise use package.json description
					const description =
						existingDescriptions.get(entry.name) || entry.description;
					cells.push(createTextCell(description));
					break;
				}
				case "path":
					cells.push(createCodeCell(entry.path));
					break;
				case "private":
					cells.push(createTextCell(entry.private ? "✓" : ""));
					break;
				default:
					// TypeScript exhaustive check - this should never happen
					break;
			}
		}

		return {
			type: "tableRow",
			children: cells,
		};
	});

	return {
		type: "table",
		align: columns.map(() => null),
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
 * Remark plugin to generate and update workspace package tables.
 *
 * The plugin looks for HTML comment markers (`<!-- workspace-packages-start -->` and
 * `<!-- workspace-packages-end -->`) in the markdown and replaces the content between
 * them with an updated table of workspace packages.
 *
 * If no markers exist, the table is appended at the end of the file with markers.
 *
 * User-edited descriptions in the description column are preserved across updates.
 *
 * @example
 * ```typescript
 * import { remark } from "remark";
 * import { remarkWorkspacePackages } from "remark-workspace-packages";
 *
 * const result = await remark()
 *   .use(remarkWorkspacePackages, { exclude: ["@internal/*"] })
 *   .process(markdown);
 * ```
 */
export const remarkWorkspacePackages: Plugin<
	[WorkspacePackagesOptions?],
	Root
> = (options) => {
	const {
		workspaceRoot: workspaceRootOption,
		sectionPrefix = "workspace-packages",
		exclude = [],
		include = [],
		includePrivate = true,
		includeLinks = true,
		columns = ["name", "description"],
		columnHeaders = {},
	} = options || {};

	const mergedColumnHeaders = {
		name: columnHeaders.name || "Package",
		description: columnHeaders.description || "Description",
		path: columnHeaders.path || "Path",
		private: columnHeaders.private || "Private",
	};

	return (tree: Root, file: VFile) => {
		// Get the directory of the markdown file
		const filePath = file.history?.[0] || file.path;
		if (!filePath) {
			file.message(
				"No file path available, skipping workspace packages generation",
			);
			return;
		}

		const dir = dirname(filePath);

		// Find workspace root
		let workspaceRoot: string | null | undefined;
		if (workspaceRootOption) {
			workspaceRoot = join(dir, workspaceRootOption);
		} else {
			workspaceRoot = resolveWorkspaceRoot(dir);
		}

		if (!workspaceRoot) {
			file.message(
				"No workspace root found, skipping package table generation",
			);
			return;
		}

		// Extract workspace packages
		const packages = extractWorkspacePackages(workspaceRoot, {
			exclude,
			include,
			includePrivate,
		});

		// If no packages, don't create/update table
		if (packages.length === 0) {
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
		const table = generateTableAst(packages, existingDescriptions, {
			columns,
			columnHeaders: mergedColumnHeaders,
			includeLinks,
		});

		// Update AST
		updateAst(tree, table, sectionPrefix, startIndex, endIndex);
	};
};

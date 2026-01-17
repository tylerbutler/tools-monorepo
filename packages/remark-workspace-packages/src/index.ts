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

const LEADING_SLASH = /^\//;

/** Available column types for the workspace packages table. */
export type ColumnType = "name" | "description" | "path" | "private";

/**
 * A package entry discovered from the workspace.
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
 * Options for the remark-workspace-packages plugin.
 */
export interface WorkspacePackagesOptions {
	/**
	 * Path to the workspace root relative to the markdown file's directory.
	 * If not specified, the plugin searches upward for pnpm-workspace.yaml or package.json with workspaces.
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
	 * Glob patterns to exclude packages from the table. Matches against package names.
	 * @default []
	 */
	exclude?: string[];

	/**
	 * Glob patterns to include packages in the table. If specified, only matching packages are included.
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
	 * Use "private" column to show package privacy status (checkmark for private, empty for public).
	 * @default ["name", "description"]
	 */
	columns?: ColumnType[];

	/**
	 * Custom column headers.
	 * @default { name: "Package", description: "Description", path: "Path", private: "Private" }
	 */
	columnHeaders?: Partial<Record<ColumnType, string>>;
}

interface PackageJson {
	name?: string;
	description?: string;
	private?: boolean;
	workspaces?: string[] | { packages: string[] };
}

function matchesPatterns(
	name: string,
	patterns: string[],
	defaultIfEmpty: boolean,
): boolean {
	if (patterns.length === 0) {
		return defaultIfEmpty;
	}
	return micromatch.isMatch(name, patterns);
}

function expandWorkspacePatterns(
	workspaceRoot: string,
	patterns: string[],
): string[] {
	const globPatterns = patterns
		.filter((p) => !p.startsWith("!"))
		.map((p) => join(p, "package.json"));

	const packageJsonPaths = globSync(globPatterns, {
		cwd: workspaceRoot,
		absolute: true,
		ignore: ["**/node_modules/**"],
	});

	return packageJsonPaths.map((p) => dirname(p));
}

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

		const relativePath = packageDir
			.replace(workspaceRoot, "")
			.replace(LEADING_SLASH, "");

		return {
			name: pkg.name,
			description: pkg.description ?? "",
			path: relativePath,
			private: pkg.private === true,
		};
	} catch {
		return undefined;
	}
}

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

		const isExcluded = matchesPatterns(pkg.name, options.exclude, false);
		const isIncluded = matchesPatterns(pkg.name, options.include, true);
		const isPrivateAndExcluded = !options.includePrivate && pkg.private;

		if (isPrivateAndExcluded || isExcluded || !isIncluded) {
			continue;
		}

		packages.push(pkg);
	}

	return packages.sort((a, b) => a.name.localeCompare(b.name));
}

interface MarkerIndices {
	startIndex: number | null;
	endIndex: number | null;
}

function findMarkers(tree: Root, prefix: string): MarkerIndices {
	const startMarker = `<!-- ${prefix}-start -->`;
	const endMarker = `<!-- ${prefix}-end -->`;

	let startIndex: number | null = null;
	let endIndex: number | null = null;

	for (let i = 0; i < tree.children.length; i++) {
		const node = tree.children[i];
		if (node?.type === "html") {
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

function extractRowData(
	row: TableRow,
): { name: string; description: string } | undefined {
	const [nameCell, descCell] = row.children;
	if (!(nameCell && descCell)) {
		return undefined;
	}

	const name = mdastToString(nameCell).trim();
	if (!name) {
		return undefined;
	}

	const description = mdastToString(descCell).trim();
	const cleanName = name.replace(/^`|`$/g, "").replace(/^\[|\].*$/g, "");
	return { name: cleanName, description };
}

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
			for (const row of tableNode.children.slice(1)) {
				const data = extractRowData(row);
				if (data) {
					descriptions.set(data.name, data.description);
				}
			}
			break;
		}
	}

	return descriptions;
}

function createTextCell(text: string): TableCell {
	return {
		type: "tableCell",
		children: [{ type: "text", value: text } as Text],
	};
}

function createCodeCell(code: string): TableCell {
	return {
		type: "tableCell",
		children: [{ type: "inlineCode", value: code } as InlineCode],
	};
}

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

/** Moves "private" column to second position (after "name") if present. */
function normalizeColumnOrder(columns: ColumnType[]): ColumnType[] {
	const privateIndex = columns.indexOf("private");
	if (privateIndex === -1 || privateIndex === 1) {
		return columns;
	}

	const result: ColumnType[] = columns.filter((col) => col !== "private");
	result.splice(1, 0, "private");
	return result;
}

interface TableGenerationOptions {
	columns: ColumnType[];
	columnHeaders: Record<ColumnType, string>;
	includeLinks: boolean;
}

function createCellForColumn(
	col: ColumnType,
	entry: PackageEntry,
	existingDescriptions: Map<string, string>,
	includeLinks: boolean,
): TableCell {
	switch (col) {
		case "name":
			return includeLinks
				? createLinkCell(entry.name, `./${entry.path}`)
				: createCodeCell(entry.name);
		case "description":
			return createTextCell(
				existingDescriptions.get(entry.name) ?? entry.description,
			);
		case "path":
			return createCodeCell(entry.path);
		case "private":
			return createTextCell(entry.private ? "✓" : "");
		default: {
			const exhaustiveCheck: never = col;
			throw new Error(`Unknown column type: ${exhaustiveCheck}`);
		}
	}
}

function generateTableAst(
	entries: PackageEntry[],
	existingDescriptions: Map<string, string>,
	options: TableGenerationOptions,
): Table {
	const columns = normalizeColumnOrder(options.columns);

	const headerRow: TableRow = {
		type: "tableRow",
		children: columns.map((col) => createTextCell(options.columnHeaders[col])),
	};

	const dataRows: TableRow[] = entries.map((entry) => ({
		type: "tableRow",
		children: columns.map((col) =>
			createCellForColumn(
				col,
				entry,
				existingDescriptions,
				options.includeLinks,
			),
		),
	}));

	return {
		type: "table",
		align: columns.map(() => null),
		children: [headerRow, ...dataRows],
	};
}

function updateAst(
	tree: Root,
	table: Table,
	prefix: string,
	markers: MarkerIndices,
): void {
	const startMarkerNode: Html = {
		type: "html",
		value: `<!-- ${prefix}-start -->`,
	};
	const endMarkerNode: Html = {
		type: "html",
		value: `<!-- ${prefix}-end -->`,
	};

	const { startIndex, endIndex } = markers;
	const hasValidMarkers =
		startIndex !== null && endIndex !== null && startIndex < endIndex;

	if (hasValidMarkers) {
		tree.children.splice(
			startIndex,
			endIndex - startIndex + 1,
			startMarkerNode,
			table,
			endMarkerNode,
		);
	} else {
		tree.children.push(startMarkerNode, table, endMarkerNode);
	}
}

/**
 * Remark plugin to generate and update workspace package tables.
 *
 * Looks for HTML comment markers (`<!-- workspace-packages-start -->` and
 * `<!-- workspace-packages-end -->`) in the markdown and replaces the content
 * between them with an updated table of workspace packages.
 *
 * If no markers exist, the table is appended at the end of the file with markers.
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
	} = options ?? {};

	const mergedColumnHeaders: Record<ColumnType, string> = {
		name: columnHeaders.name ?? "Package",
		description: columnHeaders.description ?? "Description",
		path: columnHeaders.path ?? "Path",
		private: columnHeaders.private ?? "Private",
	};

	return (tree: Root, file: VFile) => {
		const filePath = file.history?.[0] ?? file.path;
		if (!filePath) {
			file.message(
				"No file path available, skipping workspace packages generation",
			);
			return;
		}

		const dir = dirname(filePath);
		const workspaceRoot = workspaceRootOption
			? join(dir, workspaceRootOption)
			: resolveWorkspaceRoot(dir);

		if (!workspaceRoot) {
			file.message(
				"No workspace root found, skipping package table generation",
			);
			return;
		}

		const packages = extractWorkspacePackages(workspaceRoot, {
			exclude,
			include,
			includePrivate,
		});

		if (packages.length === 0) {
			return;
		}

		const markers = findMarkers(tree, sectionPrefix);
		const { startIndex, endIndex } = markers;

		const existingDescriptions =
			startIndex !== null && endIndex !== null && startIndex < endIndex
				? parseExistingTable(tree, startIndex, endIndex)
				: new Map<string, string>();

		const table = generateTableAst(packages, existingDescriptions, {
			columns,
			columnHeaders: mergedColumnHeaders,
			includeLinks,
		});

		updateAst(tree, table, sectionPrefix, markers);
	};
};

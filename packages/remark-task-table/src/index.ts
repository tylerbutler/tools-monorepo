import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import type {
	Html,
	InlineCode,
	Root,
	Table,
	TableCell,
	TableRow,
	Text,
} from "mdast";
import { toString as mdastToString } from "mdast-util-to-string";
import micromatch from "micromatch";
import { dirname, join, parse, resolve } from "pathe";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

/**
 * Represents a task entry from package.json, justfile, or Nx
 */
interface TaskEntry {
	/** Task/script/recipe name */
	name: string;
	/** The command or body text */
	command: string;
	/** Source of the task */
	source: "package.json" | "justfile" | "nx";
}

/**
 * Options for the remark-task-table plugin
 */
export interface TaskTableOptions {
	/**
	 * Path to package.json relative to the markdown file's directory.
	 * @default "package.json"
	 */
	packageJsonPath?: string;

	/**
	 * Path to justfile relative to the markdown file's directory.
	 * @default "justfile"
	 */
	justfilePath?: string;

	/**
	 * Whether to include package.json scripts.
	 * @default true
	 */
	includePackageJson?: boolean;

	/**
	 * Whether to include justfile recipes.
	 * @default true
	 */
	includeJustfile?: boolean;

	/**
	 * Prefix for section markers.
	 * Results in `<!-- {prefix}-start -->` and `<!-- {prefix}-end -->`
	 * @default "task-table"
	 */
	sectionPrefix?: string;

	/**
	 * Glob patterns to exclude scripts/recipes from the table.
	 * Matches against task names.
	 * @default []
	 */
	exclude?: string[];

	/**
	 * Whether to use Nx for task extraction when available.
	 * When true and Nx is detected in devDependencies, replaces package.json
	 * scripts with Nx targets (which include all scripts plus plugin-inferred targets).
	 * @default true
	 */
	includeNx?: boolean;

	/**
	 * The Nx project name. If not specified, inferred from package.json name.
	 * Only used when Nx extraction is enabled.
	 * @default undefined (auto-detect from package.json)
	 */
	nxProject?: string;
}

interface JustRecipe {
	name: string;
	body: string[];
	doc?: string;
	parameters?: Array<{ name: string }>;
}

interface JustDump {
	recipes: Record<string, JustRecipe>;
}

/**
 * Nx target from `nx show project --json` output
 */
interface NxTarget {
	executor: string;
	dependsOn?: string[];
	metadata?: {
		scriptContent?: string;
		description?: string;
	};
}

/**
 * Nx project from `nx show project --json` output
 */
interface NxProjectOutput {
	name: string;
	targets: Record<string, NxTarget>;
}

/**
 * Package.json structure for reading name and devDependencies
 */
interface PackageJson {
	name?: string;
	scripts?: Record<string, string>;
	devDependencies?: Record<string, string>;
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
 * Check if the `just` command is available
 */
function isJustAvailable(): boolean {
	try {
		execSync("just --version", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/**
 * Check if the `nx` command is available
 */
function isNxAvailable(): boolean {
	try {
		execSync("npx nx --version", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

/**
 * Read and parse package.json
 */
function readPackageJson(
	dir: string,
	packageJsonPath: string,
): PackageJson | undefined {
	const fullPath = resolve(dir, packageJsonPath);

	if (!existsSync(fullPath)) {
		return undefined;
	}

	try {
		const content = readFileSync(fullPath, "utf-8");
		return JSON.parse(content) as PackageJson;
	} catch {
		return undefined;
	}
}

/**
 * Find the workspace root by looking for nx.json or package.json with nx
 */
function findWorkspaceRoot(startDir: string): string | undefined {
	let current = resolve(startDir);
	const root = parse(current).root;

	while (current !== root) {
		// Check for nx.json (most reliable indicator of Nx workspace)
		if (existsSync(join(current, "nx.json"))) {
			return current;
		}
		// Check for package.json with nx in devDependencies
		const pkgPath = join(current, "package.json");
		if (existsSync(pkgPath)) {
			try {
				const content = readFileSync(pkgPath, "utf-8");
				const pkg = JSON.parse(content) as PackageJson;
				if (pkg?.devDependencies?.["nx"] !== undefined) {
					return current;
				}
			} catch {
				// Ignore parse errors
			}
		}
		current = dirname(current);
	}
	return undefined;
}

/**
 * Check if the project uses Nx
 * Looks for nx.json or nx in devDependencies at the workspace root
 */
function isNxProject(dir: string): boolean {
	return findWorkspaceRoot(dir) !== undefined;
}

/**
 * Check if a dependsOn entry is a local task (not cross-project)
 * Filters out: "^build" (upstream deps), "other-project:task" (external refs)
 */
function isLocalTask(dep: string): boolean {
	// Skip upstream dependency markers
	if (dep.startsWith("^")) {
		return false;
	}
	// Skip external project references (contains ":")
	if (dep.includes(":")) {
		return false;
	}
	return true;
}

/**
 * Extract Nx targets and sort hierarchically
 * Orchestration targets (nx:noop) come first, followed by their local dependencies
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Complex algorithm for hierarchical sorting
function extractNxTasks(
	dir: string,
	projectName: string,
	exclude: string[],
): TaskEntry[] {
	if (!isNxAvailable()) {
		throw new Error(
			"Nx is configured but 'nx' command is not available. " +
				"Install dependencies or set includeNx: false",
		);
	}

	try {
		const output = execSync(`npx nx show project ${projectName} --json`, {
			encoding: "utf-8",
			cwd: dir,
			stdio: ["pipe", "pipe", "pipe"],
		});

		const project = JSON.parse(output) as NxProjectOutput;
		const targets = project.targets;

		// Separate orchestration vs implementation targets
		const orchestrationTargets: Array<{ name: string; target: NxTarget }> = [];
		const implementationTargets: Map<string, NxTarget> = new Map();

		for (const [name, target] of Object.entries(targets)) {
			if (isExcluded(name, exclude)) {
				continue;
			}

			if (target.executor === "nx:noop") {
				orchestrationTargets.push({ name, target });
			} else {
				implementationTargets.set(name, target);
			}
		}

		// Sort orchestration targets alphabetically
		orchestrationTargets.sort((a, b) => a.name.localeCompare(b.name));

		// Build hierarchical output
		const entries: TaskEntry[] = [];
		const addedTasks = new Set<string>();

		// Process each orchestration target and its dependencies
		for (const { name, target } of orchestrationTargets) {
			// Add the orchestration target
			entries.push({
				name,
				command: `Orchestrates ${name} pipeline`,
				source: "nx",
			});
			addedTasks.add(name);

			// Add its local dependencies in order
			const localDeps = (target.dependsOn ?? [])
				.filter(isLocalTask)
				.filter((dep) => !isExcluded(dep, exclude))
				.sort((a, b) => a.localeCompare(b));

			for (const dep of localDeps) {
				if (addedTasks.has(dep)) {
					continue;
				}

				const depTarget = implementationTargets.get(dep);
				if (depTarget) {
					const command =
						depTarget.metadata?.scriptContent ||
						depTarget.metadata?.description ||
						dep;
					entries.push({
						name: dep,
						command,
						source: "nx",
					});
					addedTasks.add(dep);
				}
			}
		}

		// Add any remaining implementation targets not referenced by orchestration
		const remainingTargets = [...implementationTargets.entries()]
			.filter(([name]) => !addedTasks.has(name))
			.sort(([a], [b]) => a.localeCompare(b));

		for (const [name, target] of remainingTargets) {
			const command =
				target.metadata?.scriptContent || target.metadata?.description || name;
			entries.push({
				name,
				command,
				source: "nx",
			});
		}

		return entries;
	} catch (error) {
		throw new Error(
			`Failed to get Nx project info: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
}

/**
 * Extract scripts from package.json
 */
function extractPackageJsonScripts(
	dir: string,
	packageJsonPath: string,
	exclude: string[],
): TaskEntry[] {
	const fullPath = resolve(dir, packageJsonPath);

	if (!existsSync(fullPath)) {
		return [];
	}

	try {
		const content = readFileSync(fullPath, "utf-8");
		const pkg = JSON.parse(content) as { scripts?: Record<string, string> };

		if (!pkg.scripts) {
			return [];
		}

		const entries: TaskEntry[] = [];

		for (const [name, command] of Object.entries(pkg.scripts)) {
			if (!isExcluded(name, exclude)) {
				entries.push({ name, command, source: "package.json" });
			}
		}

		return entries.sort((a, b) => a.name.localeCompare(b.name));
	} catch {
		return [];
	}
}

/**
 * Extract recipes from justfile using `just --dump --dump-format json`
 */
function extractJustfileRecipes(
	dir: string,
	justfilePath: string,
	exclude: string[],
): TaskEntry[] {
	const fullPath = resolve(dir, justfilePath);

	if (!existsSync(fullPath)) {
		return [];
	}

	if (!isJustAvailable()) {
		throw new Error(
			"Justfile found at " +
				fullPath +
				" but 'just' command is not available. " +
				"Install just (https://just.systems) or set includeJustfile: false",
		);
	}

	try {
		const output = execSync(
			`just --dump --dump-format json --justfile "${fullPath}"`,
			{
				encoding: "utf-8",
				cwd: dir,
			},
		);

		const dump = JSON.parse(output) as JustDump;
		const entries: TaskEntry[] = [];

		for (const [name, recipe] of Object.entries(dump.recipes)) {
			if (!isExcluded(name, exclude)) {
				// Use doc comment if available, otherwise join body lines
				const command = recipe.doc || recipe.body.join(" && ").trim() || name;
				entries.push({ name, command, source: "justfile" });
			}
		}

		return entries.sort((a, b) => a.name.localeCompare(b.name));
	} catch (error) {
		throw new Error(
			`Failed to parse justfile: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
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

	// Remove backticks from inline code
	const cleanName = name.replace(/^`|`$/g, "");
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
 * Generate a new table AST from task entries
 */
function generateTableAst(
	entries: TaskEntry[],
	existingDescriptions: Map<string, string>,
): Table {
	const headerRow: TableRow = {
		type: "tableRow",
		children: [createTextCell("Task"), createTextCell("Description")],
	};

	const dataRows: TableRow[] = entries.map((entry) => {
		// Preserve existing description if present, otherwise use command
		const description = existingDescriptions.get(entry.name) ?? entry.command;

		return {
			type: "tableRow",
			children: [createCodeCell(entry.name), createTextCell(description)],
		};
	});

	return {
		type: "table",
		align: [null, null],
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
 * Remark plugin to generate and update task tables from package.json scripts
 * and justfile recipes.
 *
 * The plugin looks for HTML comment markers (`<!-- task-table-start -->` and
 * `<!-- task-table-end -->`) in the markdown and replaces the content between
 * them with an updated table.
 *
 * If no markers exist, the table is appended at the end of the file with markers.
 *
 * User-edited descriptions in the second column are preserved across updates.
 *
 * @example
 * ```typescript
 * import { remark } from "remark";
 * import { remarkTaskTable } from "remark-task-table";
 *
 * const result = await remark()
 *   .use(remarkTaskTable, { exclude: ["test:*"] })
 *   .process(markdown);
 * ```
 */
export const remarkTaskTable: Plugin<[TaskTableOptions?], Root> = (options) => {
	const {
		packageJsonPath = "package.json",
		justfilePath = "justfile",
		includePackageJson = true,
		includeJustfile = true,
		includeNx = true,
		nxProject,
		sectionPrefix = "task-table",
		exclude = [],
	} = options || {};

	// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Plugin logic with multiple source extraction paths
	return (tree: Root, file: VFile) => {
		// Get the directory of the markdown file
		const filePath = file.history?.[0] || file.path;
		if (!filePath) {
			file.message("No file path available, skipping task table generation");
			return;
		}

		const dir = dirname(filePath);

		// Collect all task entries
		const allEntries: TaskEntry[] = [];

		// Check if this is an Nx project and Nx extraction is enabled
		const useNx = includeNx && isNxProject(dir);

		if (useNx) {
			// Get project name from option or package.json
			const pkg = readPackageJson(dir, packageJsonPath);
			const projectName = nxProject ?? pkg?.name;

			if (projectName) {
				const nxTasks = extractNxTasks(dir, projectName, exclude);
				allEntries.push(...nxTasks);
			}
		} else if (includePackageJson) {
			// Fall back to package.json scripts when not using Nx
			const pkgScripts = extractPackageJsonScripts(
				dir,
				packageJsonPath,
				exclude,
			);
			allEntries.push(...pkgScripts);
		}

		// Extract from justfile (always, regardless of Nx)
		if (includeJustfile) {
			const justRecipes = extractJustfileRecipes(dir, justfilePath, exclude);
			allEntries.push(...justRecipes);
		}

		// If no entries, don't create/update table
		if (allEntries.length === 0) {
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
		const table = generateTableAst(allEntries, existingDescriptions);

		// Update AST
		updateAst(tree, table, sectionPrefix, startIndex, endIndex);
	};
};

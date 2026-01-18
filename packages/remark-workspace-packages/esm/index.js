import { existsSync, readFileSync } from "node:fs";
import { toString as mdastToString } from "mdast-util-to-string";
import micromatch from "micromatch";
import { dirname, join } from "pathe";
import resolveWorkspacePkg from "resolve-workspace-root";
import { globSync } from "tinyglobby";
const { getWorkspaceGlobs, resolveWorkspaceRoot } = resolveWorkspacePkg;
const LEADING_SLASH = /^\//;
function matchesPatterns(name, patterns, defaultIfEmpty) {
    if (patterns.length === 0) {
        return defaultIfEmpty;
    }
    return micromatch.isMatch(name, patterns);
}
function expandWorkspacePatterns(workspaceRoot, patterns) {
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
function readPackageInfo(packageDir, workspaceRoot) {
    const pkgJsonPath = join(packageDir, "package.json");
    if (!existsSync(pkgJsonPath)) {
        return undefined;
    }
    try {
        const content = readFileSync(pkgJsonPath, "utf-8");
        const pkg = JSON.parse(content);
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
    }
    catch {
        return undefined;
    }
}
function extractWorkspacePackages(workspaceRoot, options) {
    const patterns = getWorkspaceGlobs(workspaceRoot);
    if (patterns === null || patterns.length === 0) {
        return [];
    }
    const packageDirs = expandWorkspacePatterns(workspaceRoot, patterns);
    const packages = [];
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
function findMarkers(tree, prefix) {
    const startMarker = `<!-- ${prefix}-start -->`;
    const endMarker = `<!-- ${prefix}-end -->`;
    let startIndex = null;
    let endIndex = null;
    for (let i = 0; i < tree.children.length; i++) {
        const node = tree.children[i];
        if (node?.type === "html") {
            const value = node.value.trim();
            if (value === startMarker) {
                startIndex = i;
            }
            else if (value === endMarker) {
                endIndex = i;
            }
        }
    }
    return { startIndex, endIndex };
}
function extractRowData(row) {
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
function parseExistingTable(tree, startIndex, endIndex) {
    const descriptions = new Map();
    for (let i = startIndex + 1; i < endIndex; i++) {
        const node = tree.children[i];
        if (node?.type === "table") {
            const tableNode = node;
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
function createTextCell(text) {
    return {
        type: "tableCell",
        children: [{ type: "text", value: text }],
    };
}
function createCodeCell(code) {
    return {
        type: "tableCell",
        children: [{ type: "inlineCode", value: code }],
    };
}
function createLinkCell(text, url) {
    return {
        type: "tableCell",
        children: [
            {
                type: "link",
                url,
                children: [{ type: "inlineCode", value: text }],
            },
        ],
    };
}
/** Moves "private" column to second position (after "name") if present. */
function normalizeColumnOrder(columns) {
    const privateIndex = columns.indexOf("private");
    if (privateIndex === -1 || privateIndex === 1) {
        return columns;
    }
    const result = columns.filter((col) => col !== "private");
    result.splice(1, 0, "private");
    return result;
}
function createCellForColumn(col, entry, existingDescriptions, includeLinks) {
    switch (col) {
        case "name":
            return includeLinks
                ? createLinkCell(entry.name, `./${entry.path}`)
                : createCodeCell(entry.name);
        case "description":
            return createTextCell(existingDescriptions.get(entry.name) ?? entry.description);
        case "path":
            return createCodeCell(entry.path);
        case "private":
            return createTextCell(entry.private ? "✓" : "");
        default: {
            const exhaustiveCheck = col;
            throw new Error(`Unknown column type: ${exhaustiveCheck}`);
        }
    }
}
function generateTableAst(entries, existingDescriptions, options) {
    const columns = normalizeColumnOrder(options.columns);
    const headerRow = {
        type: "tableRow",
        children: columns.map((col) => createTextCell(options.columnHeaders[col])),
    };
    const dataRows = entries.map((entry) => ({
        type: "tableRow",
        children: columns.map((col) => createCellForColumn(col, entry, existingDescriptions, options.includeLinks)),
    }));
    return {
        type: "table",
        align: columns.map(() => null),
        children: [headerRow, ...dataRows],
    };
}
function updateAst(tree, table, prefix, markers) {
    const startMarkerNode = {
        type: "html",
        value: `<!-- ${prefix}-start -->`,
    };
    const endMarkerNode = {
        type: "html",
        value: `<!-- ${prefix}-end -->`,
    };
    const { startIndex, endIndex } = markers;
    const hasValidMarkers = startIndex !== null && endIndex !== null && startIndex < endIndex;
    if (hasValidMarkers) {
        tree.children.splice(startIndex, endIndex - startIndex + 1, startMarkerNode, table, endMarkerNode);
    }
    else {
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
export const remarkWorkspacePackages = (options) => {
    const { workspaceRoot: workspaceRootOption, sectionPrefix = "workspace-packages", exclude = [], include = [], includePrivate = true, includeLinks = true, columns = ["name", "description"], columnHeaders = {}, } = options ?? {};
    const mergedColumnHeaders = {
        name: columnHeaders.name ?? "Package",
        description: columnHeaders.description ?? "Description",
        path: columnHeaders.path ?? "Path",
        private: columnHeaders.private ?? "Private",
    };
    return (tree, file) => {
        const filePath = file.history?.[0] ?? file.path;
        if (!filePath) {
            file.message("No file path available, skipping workspace packages generation");
            return;
        }
        const dir = dirname(filePath);
        const workspaceRoot = workspaceRootOption
            ? join(dir, workspaceRootOption)
            : resolveWorkspaceRoot(dir);
        if (!workspaceRoot) {
            file.message("No workspace root found, skipping package table generation");
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
        const existingDescriptions = startIndex !== null && endIndex !== null && startIndex < endIndex
            ? parseExistingTable(tree, startIndex, endIndex)
            : new Map();
        const table = generateTableAst(packages, existingDescriptions, {
            columns,
            columnHeaders: mergedColumnHeaders,
            includeLinks,
        });
        updateAst(tree, table, sectionPrefix, markers);
    };
};
//# sourceMappingURL=index.js.map
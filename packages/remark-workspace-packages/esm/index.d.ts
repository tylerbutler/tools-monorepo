import type { Root } from "mdast";
import type { Plugin } from "unified";
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
export declare const remarkWorkspacePackages: Plugin<[
    WorkspacePackagesOptions?
], Root>;
//# sourceMappingURL=index.d.ts.map
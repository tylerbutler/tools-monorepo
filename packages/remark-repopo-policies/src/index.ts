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

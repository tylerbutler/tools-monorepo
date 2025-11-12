import type { Heading, Root } from "mdast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";

interface Options {
	defaultCollectionLevel?: number;
	defaultPageLevel?: number;
	maxLevel?: number;
}

interface AstroData {
	astro?: {
		frontmatter?: {
			headingStartLevel?: number;
		};
	};
	headingStartLevel?: number;
}

// Regex to detect content collection paths (moved to top level for performance)
const COLLECTION_PATH_REGEX = /\/src\/content\/(articles|projects)\//;

/**
 * Remark plugin to shift heading levels based on context
 *
 * By default, content collection pages (articles, projects) start at h2
 * since their titles are h1 in the layout. Other pages start at h1.
 *
 * Override behavior via frontmatter:
 *   headingStartLevel: 3  # Force highest heading to be h3
 */
export const remarkShiftHeadings: Plugin<[Options?], Root> = (options) => {
	const {
		defaultCollectionLevel = 2,
		defaultPageLevel = 1,
		maxLevel = 6,
	} = options || {};

	return (tree: Root, file: VFile) => {
		const fileData = file.data as AstroData;

		// Strategy 1: Check frontmatter for explicit override
		const frontmatterLevel = fileData.astro?.frontmatter?.headingStartLevel;

		// Strategy 2: Check if rendering context was set (for Container API usage)
		const contextLevel = fileData.headingStartLevel;

		// Strategy 3: Auto-detect content collections from file path
		const filePath = file.history?.[0] || "";
		const isCollection = COLLECTION_PATH_REGEX.test(filePath);

		// Determine target start level (frontmatter > context > auto-detect)
		const targetStartLevel =
			frontmatterLevel ??
			contextLevel ??
			(isCollection ? defaultCollectionLevel : defaultPageLevel);

		// Skip shifting if target is h1 (no adjustment needed)
		if (targetStartLevel === 1) {
			return;
		}

		// Find minimum heading level in the content
		let minLevel = Number.POSITIVE_INFINITY;
		visit(tree, "heading", (node: Heading) => {
			if (node.depth < minLevel) {
				minLevel = node.depth;
			}
		});

		// No headings found, nothing to shift
		if (minLevel === Number.POSITIVE_INFINITY) {
			return;
		}

		// Calculate shift amount needed
		const shiftBy = targetStartLevel - minLevel;

		// Skip if no shift needed
		if (shiftBy === 0) {
			return;
		}

		// Apply shift to all headings
		visit(tree, "heading", (node: Heading) => {
			const newLevel = node.depth + shiftBy;
			// Ensure level stays within valid range (1-maxLevel)
			node.depth = Math.max(1, Math.min(newLevel, maxLevel)) as
				| 1
				| 2
				| 3
				| 4
				| 5
				| 6;
		});
	};
};

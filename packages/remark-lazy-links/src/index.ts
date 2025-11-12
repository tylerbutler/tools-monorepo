import { writeFileSync } from "node:fs";
import type { Root } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import type { Plugin } from "unified";
import type { VFile } from "vfile";

interface LazyLinksOptions {
	/**
	 * Whether to persist the transformed links back to source files.
	 *
	 * When false (default): Transformation happens in-memory only during build.
	 * Source files remain unchanged with [*] markers.
	 *
	 * When true: Source files are permanently modified, replacing [*] with
	 * numbered links. Useful if you want the transformed format to be the
	 * canonical version or need to use files outside of Astro.
	 *
	 * @default false
	 */
	persist?: boolean;
}

/**
 * Finds the maximum numbered link reference in the content
 */
function findMaxCounter(content: string): number {
	const counterRegex = /\[(\d+)\]:/g;
	let maxCounter = 0;
	const matches = content.matchAll(counterRegex);

	for (const match of matches) {
		if (match[1]) {
			const num = Number.parseInt(match[1], 10);
			if (num > maxCounter) {
				maxCounter = num;
			}
		}
	}

	return maxCounter;
}

/**
 * Transforms lazy links [*] to numbered references
 */
function transformLazyLinks(
	content: string,
	startCounter: number,
): {
	transformed: string;
	hasChanges: boolean;
} {
	let transformed = content;
	let hasChanges = false;

	// Count total [*] occurrences
	const totalMatches = (content.match(/\[\*\]/g) || []).length;

	if (totalMatches === 0) {
		return { transformed, hasChanges: false };
	}

	// Strategy: The first half are references, the second half are definitions
	// They map 1-to-1 in order
	//
	// Example input:  "[first][*] and [second][*]\n\n[*]: http://first.com\n[*]: http://second.com"
	// Occurrences: 4 total, so 2 references and 2 definitions
	// After transform: "[first][1] and [second][2]\n\n[1]: http://first.com\n[2]: http://second.com"

	const halfPoint = totalMatches / 2;
	let occurrenceCount = 0;
	let counter = startCounter;

	transformed = transformed.replace(/\[\*\]/g, () => {
		occurrenceCount++;
		hasChanges = true;

		// For the first half (references), increment counter
		// For the second half (definitions), use counter from corresponding reference
		if (occurrenceCount <= halfPoint) {
			// This is a reference
			counter++;
			return `[${counter}]`;
		}
		// This is a definition - use the number from (occurrenceCount - halfPoint)
		const refNumber = startCounter + (occurrenceCount - halfPoint);
		return `[${refNumber}]`;
	});

	return { transformed, hasChanges };
}

/**
 * Persists the transformed content to the source file
 */
function persistToFile(filepath: string, content: string): void {
	try {
		writeFileSync(filepath, content, "utf-8");
	} catch {
		// Silently fail if file cannot be written (e.g., readonly filesystem)
		// The transformation is still applied in-memory for the build
	}
}

/**
 * Remark plugin to transform lazy markdown links [*] into numbered references.
 *
 * Inspired by Brett Terpstra's lazy markdown reference links:
 * http://brettterpstra.com/2013/10/19/lazy-markdown-reference-links/
 *
 * Transforms:
 *   [link text][*]  and  [*]: http://url
 * Into:
 *   [link text][1]  and  [1]: http://url
 *
 * Features:
 * - Preserves existing numbered links
 * - Handles multiple overlapping lazy links
 * - Configurable persistence (in-memory or write back to source)
 *
 * @example
 * // In-memory transformation only (default)
 * remarkPlugins: [remarkLazyLinks]
 *
 * @example
 * // Persist changes back to source files
 * remarkPlugins: [[remarkLazyLinks, { persist: true }]]
 */
export const remarkLazyLinks: Plugin<[LazyLinksOptions?], Root> = (
	options = {},
) => {
	const { persist = false } = options;

	return (_tree: Root, file: VFile) => {
		// This runs after parsing, but we need to work on the original text
		// The key insight: unified processes file.value through the parser
		// We need to get the ORIGINAL value before it was parsed

		// Get the original file contents (before parsing)
		const originalContent = file.toString();

		// Check if there are any lazy links to process
		if (!originalContent.includes("[*]")) {
			return;
		}

		// Find the maximum existing numbered link to avoid conflicts
		const maxCounter = findMaxCounter(originalContent);

		// Transform lazy links to numbered links
		const { transformed, hasChanges } = transformLazyLinks(
			originalContent,
			maxCounter,
		);

		if (!hasChanges) {
			return;
		}

		// If persist is enabled and changes were made, write back to source file
		if (persist) {
			const filepath = file.history?.[0];
			if (filepath) {
				persistToFile(filepath, transformed);
			}
		}

		// Re-parse the transformed content to get the correct AST
		// This is necessary because we modified the raw text, but the tree was already parsed
		const newTree = fromMarkdown(transformed);

		// Replace the current tree's children and data with the new tree
		_tree.children = newTree.children;
		if (newTree.data) {
			_tree.data = newTree.data;
		}
	};
};

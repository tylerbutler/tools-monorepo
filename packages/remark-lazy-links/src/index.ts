import { writeFileSync } from "node:fs";
import type { Root } from "mdast";
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
	const linkRegex =
		/(\[[^\]]+\]\s*\[)\*(\](?:(?!\[[^\]]+\]\s*\[)[\s\S])*?\[)\*\]:/g;
	let transformed = content;
	let hasChanges = false;
	let counter = startCounter;

	while (linkRegex.test(transformed)) {
		linkRegex.lastIndex = 0;
		transformed = transformed.replace(linkRegex, (_match, group1, group2) => {
			counter++;
			hasChanges = true;
			return `${group1}${counter}${group2}${counter}]:`;
		});
		linkRegex.lastIndex = 0;
	}

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
		// Get the raw markdown content
		const content = String(file.value || "");

		// Check if there are any lazy links to process
		if (!content.includes("[*]")) {
			return;
		}

		// Find the maximum existing numbered link to avoid conflicts
		const maxCounter = findMaxCounter(content);

		// Transform lazy links to numbered links
		const { transformed, hasChanges } = transformLazyLinks(content, maxCounter);

		// Update the file content for further processing (in-memory)
		file.value = transformed;

		// If persist is enabled and changes were made, write back to source file
		if (persist && hasChanges) {
			const filepath = file.history?.[0];
			if (filepath) {
				persistToFile(filepath, transformed);
			}
		}
	};
};

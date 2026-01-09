import { readFile } from "node:fs/promises";

/**
 * Represents detected indentation style.
 *
 * - `"\t"` - Tab character
 * - `number` - Number of spaces (e.g., 2, 4)
 */
export type IndentationStyle = "\t" | number;

/**
 * Default indentation style used when detection fails or no indentation is found.
 *
 * @alpha
 */
export const DEFAULT_INDENTATION: IndentationStyle = "\t";

/**
 * Detect the indentation style used in a file.
 *
 * Analyzes the file content to determine whether tabs or spaces are used
 * for indentation. This is useful when writing files to preserve
 * the existing formatting style.
 *
 * @param filePath - Path to the file
 * @param defaultIndentation - Indentation to use if detection fails (default: tab)
 * @returns The detected indentation (tab character or number of spaces)
 *
 * @example
 * ```typescript
 * const indent = await detectIndentation("/path/to/package.json");
 * // Returns "\t" for tabs, or a number like 2 or 4 for spaces
 *
 * // With custom default
 * const indent = await detectIndentation("/path/to/file.yaml", 2);
 * ```
 *
 * @alpha
 */
export async function detectIndentation(
	filePath: string,
	defaultIndentation: IndentationStyle = DEFAULT_INDENTATION,
): Promise<IndentationStyle> {
	try {
		const content = await readFile(filePath, "utf-8");
		return detectIndentationFromContent(content, defaultIndentation);
	} catch {
		// If we can't read the file, use default
		return defaultIndentation;
	}
}

/**
 * Detect the indentation style used in text content.
 *
 * Analyzes the content string to determine whether tabs or spaces are used
 * for indentation. This is a pure function useful for testing and for
 * cases where the content is already in memory.
 *
 * The detection algorithm:
 * 1. Splits content into lines
 * 2. Finds the first line that starts with whitespace
 * 3. If it starts with a tab, returns tab
 * 4. If it starts with spaces, returns the count of leading spaces
 * 5. If no indented lines found, returns the default
 *
 * @param content - The file content as a string
 * @param defaultIndentation - Indentation to use if no indented lines found (default: tab)
 * @returns The detected indentation (tab character or number of spaces)
 *
 * @example
 * ```typescript
 * // JSON with 2-space indentation
 * const json = '{\n  "name": "test"\n}';
 * detectIndentationFromContent(json); // Returns 2
 *
 * // YAML with tab indentation
 * const yaml = 'root:\n\tchild: value';
 * detectIndentationFromContent(yaml); // Returns "\t"
 *
 * // No indentation found - uses default
 * detectIndentationFromContent('no indent'); // Returns "\t"
 * detectIndentationFromContent('no indent', 4); // Returns 4
 * ```
 *
 * @alpha
 */
export function detectIndentationFromContent(
	content: string,
	defaultIndentation: IndentationStyle = DEFAULT_INDENTATION,
): IndentationStyle {
	const lines = content.split("\n");

	// Look for the first indented line to detect the pattern
	for (const line of lines) {
		const match = /^(\s+)/.exec(line);
		if (match?.[1]) {
			const indent = match[1];
			// Check if it's tabs
			if (indent.startsWith("\t")) {
				return "\t";
			}
			// Count spaces
			return indent.length;
		}
	}

	// No indented lines found, use default
	return defaultIndentation;
}

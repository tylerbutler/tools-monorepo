#!/usr/bin/env node

/**
 * CCL Syntax Highlighting Demonstration Tool
 * ==========================================
 *
 * This script demonstrates the tree-sitter CCL parser's syntax highlighting
 * capabilities by applying ANSI color codes to CCL source files. It serves
 * as both a development tool and a showcase of the parser's accuracy.
 *
 * FEATURES:
 * - Parses CCL files using tree-sitter queries
 * - Applies color-coded highlighting based on syntax elements
 * - Handles multiline constructs (comments, values, nested sections)
 * - Provides fallback for parsing errors
 * - Terminal-friendly ANSI color output
 *
 * USAGE:
 *   node show_highlight.js <ccl-file>
 *
 * DEPENDENCIES:
 * - tree-sitter CLI (via npx)
 * - CCL grammar with highlight queries (queries/highlights.scm)
 * - Node.js built-in modules: fs, child_process
 *
 * ARCHITECTURE:
 * 1. Parse CCL file using tree-sitter query command
 * 2. Extract highlight capture groups with positions
 * 3. Sort highlights by document position
 * 4. Apply ANSI color codes to matching text spans
 * 5. Output colorized text to terminal
 *
 * This tool is particularly useful for:
 * - Verifying parser correctness
 * - Testing highlight query accuracy
 * - Demonstrating CCL syntax features
 * - Development and debugging
 */

const fs = require("fs");
const { execSync } = require("child_process");

/**
 * ANSI color codes for terminal output
 *
 * These escape sequences control text color in terminals that support ANSI.
 * Each color is defined as a string that can be concatenated with text.
 * The 'reset' code returns text to default terminal color.
 *
 * Format: '\x1b[{code}m' where:
 * - \x1b is the escape character
 * - [ starts the control sequence
 * - {code} is the color number (31=red, 32=green, etc.)
 * - m ends the control sequence
 */
const colors = {
	red: "\x1b[31m", // Error/warning text
	green: "\x1b[32m", // String literals and values
	yellow: "\x1b[33m", // Operators and punctuation
	blue: "\x1b[34m", // Identifiers and keys
	magenta: "\x1b[35m", // Special markers (comment delimiters)
	cyan: "\x1b[36m", // Structural elements (indentation)
	gray: "\x1b[37m", // Comments and secondary text
	reset: "\x1b[0m", // Return to default color
};

/**
 * Color mapping for CCL syntax highlight groups
 *
 * Maps tree-sitter highlight capture names (from queries/highlights.scm)
 * to ANSI color codes. This configuration determines how different
 * syntax elements appear in the terminal.
 *
 * HIGHLIGHT GROUP MAPPING:
 * - variable.other.member: Configuration keys (blue)
 *   - Covers: single_line_key, key_continuation, multiline_key
 * - operator: Assignment operators (yellow)
 *   - Covers: '=' symbols
 * - string: Values and content (green)
 *   - Covers: single_line_value, content_line, multiline text
 * - comment.marker: Comment delimiters (magenta)
 *   - Covers: '/=' comment start symbols
 * - comment.text: Comment content (gray)
 *   - Covers: All comment text content
 * - punctuation.indent: Structural whitespace (cyan)
 *   - Covers: Significant indentation (when visible)
 *
 * NOTE: Some tokens (dedent, newline) are zero-width structural tokens
 * that don't have visible content, so they don't need color assignments.
 */
const highlightColors = {
	"variable.other.member": colors.blue, // Configuration keys
	operator: colors.yellow, // Assignment operators (=)
	string: colors.green, // Values and string content
	"comment.marker": colors.magenta, // Comment markers (/=)
	"comment.text": colors.gray, // Comment text content
	"punctuation.indent": colors.cyan, // Structural indentation
};

/**
 * Command-line argument processing and file validation
 *
 * Expects exactly one argument: the path to a CCL file to highlight.
 * Performs validation to ensure the file exists before processing.
 */

// Extract file path from command-line arguments
const filePath = process.argv[2];
if (!filePath) {
	console.error("Usage: node show_highlight.js <ccl-file>");
	console.error("");
	console.error("Examples:");
	console.error("  node show_highlight.js sample.ccl");
	console.error("  node show_highlight.js test_files/example.ccl");
	process.exit(1);
}

// Verify file exists before attempting to read
if (!fs.existsSync(filePath)) {
	console.error(`Error: File '${filePath}' not found`);
	console.error("Please check the file path and try again.");
	process.exit(1);
}

// Read file content and prepare for line-by-line processing
const code = fs.readFileSync(filePath, "utf8");
const lines = code.split("\n");

try {
	/**
	 * PHASE 1: Parse CCL file and extract highlight information
	 *
	 * Uses tree-sitter CLI to:
	 * 1. Parse the CCL file using our grammar
	 * 2. Apply highlight queries (queries/highlights.scm)
	 * 3. Extract capture groups with precise position information
	 *
	 * The query output format is:
	 * "capture: N - highlight_group, start: (row, col), end: (row, col), text: `content`"
	 */
	const queryOutput = execSync(
		`npx tree-sitter query queries/highlights.scm "${filePath}"`,
		{ encoding: "utf8" },
	);

	/**
	 * PHASE 2: Parse query output and extract highlight data
	 *
	 * The tree-sitter query output contains lines like:
	 * "capture: 0 - variable.other.member, start: (0, 0), end: (0, 6), text: `server`"
	 *
	 * We parse these lines to extract:
	 * - Highlight type (e.g., 'variable.other.member')
	 * - Start position (row, column)
	 * - End position (row, column)
	 * - Matched text content
	 *
	 * This creates a structured array of highlight objects for processing.
	 */
	const highlights = [];
	const queryLines = queryOutput
		.split("\n")
		.filter((line) => line.includes("capture:"));

	// Parse each capture line using regex to extract components
	for (const line of queryLines) {
		const match = line.match(
			/capture: \d+ - ([^,]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\), text: `([^`]*)`/,
		);
		if (match) {
			const [, type, startRow, startCol, endRow, endCol, text] = match;
			highlights.push({
				type: type.trim(), // Highlight group name
				startRow: parseInt(startRow), // Zero-based line number (start)
				startCol: parseInt(startCol), // Zero-based column number (start)
				endRow: parseInt(endRow), // Zero-based line number (end)
				endCol: parseInt(endCol), // Zero-based column number (end)
				text: text, // Actual matched text
			});
		}
	}

	/**
	 * PHASE 3: Sort highlights by document position
	 *
	 * Sorting ensures we process highlights in reading order:
	 * 1. Primary sort: by line number (startRow)
	 * 2. Secondary sort: by column position (startCol)
	 *
	 * This ordering is critical for applying colors correctly
	 * when multiple highlights exist on the same line.
	 */
	highlights.sort((a, b) => {
		if (a.startRow !== b.startRow) return a.startRow - b.startRow;
		return a.startCol - b.startCol;
	});

	/**
	 * PHASE 4: Apply color highlighting to each line
	 *
	 * Process each line of the original file:
	 * 1. Find all highlights that start on this line
	 * 2. Build the line incrementally:
	 *    - Add unhighlighted text before each highlight
	 *    - Add highlighted text with appropriate colors
	 *    - Track position to avoid overlapping
	 * 3. Add any remaining unhighlighted text
	 *
	 * This approach handles multiple highlights per line correctly
	 * and preserves the original text structure.
	 */
	const highlightedLines = [];
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		let highlightedLine = ""; // Build colored version incrementally
		let pos = 0; // Track current position in line

		// Find all highlights that start on this line
		const lineHighlights = highlights.filter((h) => h.startRow === i);

		// Process each highlight on this line in order
		for (const highlight of lineHighlights) {
			// Add unhighlighted text before this highlight
			highlightedLine += line.slice(pos, highlight.startCol);

			// Add highlighted text with appropriate color
			const color = highlightColors[highlight.type] || colors.reset;
			highlightedLine += color + highlight.text + colors.reset;

			// Update position to end of this highlight
			pos = highlight.endCol;
		}

		// Add any remaining unhighlighted text after the last highlight
		highlightedLine += line.slice(pos);
		highlightedLines.push(highlightedLine);
	}

	/**
	 * PHASE 5: Output the colorized result
	 *
	 * Join all highlighted lines back into a complete document
	 * and output to stdout for terminal display.
	 */
	console.log(highlightedLines.join("\n"));
} catch (error) {
	/**
	 * Error handling and fallback
	 *
	 * If syntax highlighting fails (e.g., tree-sitter not available,
	 * grammar compilation issues, or parsing errors), gracefully
	 * fall back to displaying the original file content without colors.
	 *
	 * This ensures the tool remains useful even when highlighting fails.
	 */
	console.error("Warning: Syntax highlighting failed, showing plain text:");
	console.error(`Error details: ${error.message}`);
	console.error("");
	console.log(code);
}

#!/usr/bin/env node

const fs = require("fs");
const { execSync } = require("child_process");

// ANSI color codes
const colors = {
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
	gray: "\x1b[37m",
	reset: "\x1b[0m",
};

// Color mapping for highlight groups
const highlightColors = {
	"variable.other.member": colors.blue, // Keys: single_line_key, key_continuation, multiline_key
	operator: colors.yellow, // Assignment operators
	string: colors.green, // Values: single_line_value, content_line
	"comment.marker": colors.magenta, // Comment markers: /=
	"comment.text": colors.gray, // Comment text content
	"punctuation.indent": colors.cyan, // Visible indentation whitespace
	// Note: dedent and newline tokens are zero-width, so no colors assigned
};

/**
 * Regex-based CCL syntax highlighting for nested content
 *
 * This function simulates what tree-sitter injection parsing would do
 * by applying CCL syntax highlighting using regular expressions.
 * It's a simplified version that handles common CCL patterns.
 *
 * SUPPORTED PATTERNS:
 * - Comments: "/= comment text"
 * - Key-value pairs: "key = value"
 * - List items: "= value"
 * - Preserves indentation and spacing
 *
 * LIMITATIONS:
 * - Uses regex instead of proper parsing
 * - May not handle all edge cases correctly
 * - Cannot handle complex multiline constructs
 * - No error recovery for malformed syntax
 *
 * @param {string} line - The line of text to highlight
 * @returns {string} - The line with ANSI color codes applied
 */
function highlightCCLLine(line) {
	// Apply regex-based CCL syntax highlighting to simulate injection parsing

	let highlighted = line;

	// Replace CCL patterns with highlighted versions
	// Comments: /= comment text
	highlighted = highlighted.replace(
		/(\/=.*$)/g,
		colors.gray + "$1" + colors.reset,
	);

	// Key = value patterns
	highlighted = highlighted.replace(
		/^(\s*)([^=\s][^=]*?)\s*(=)\s*(.*)$/g,
		"$1" +
			colors.blue +
			"$2" +
			colors.reset +
			" " +
			colors.yellow +
			"$3" +
			colors.reset +
			" " +
			colors.green +
			"$4" +
			colors.reset,
	);

	// List items: = value
	highlighted = highlighted.replace(
		/^(\s*)(=)\s*(.*)$/g,
		"$1" +
			colors.yellow +
			"$2" +
			colors.reset +
			" " +
			colors.green +
			"$3" +
			colors.reset,
	);

	return highlighted;
}

// Get file path from command line argument
const filePath = process.argv[2];
if (!filePath) {
	console.error("Usage: node show_highlight_enhanced.js <ccl-file>");
	process.exit(1);
}

if (!fs.existsSync(filePath)) {
	console.error(`Error: File '${filePath}' not found`);
	process.exit(1);
}

const code = fs.readFileSync(filePath, "utf8");
const lines = code.split("\n");

try {
	// Run tree-sitter query to get highlighting info
	const queryOutput = execSync(
		`npx tree-sitter query queries/highlights.scm "${filePath}"`,
		{ encoding: "utf8" },
	);

	// Parse the query output to extract highlights
	const highlights = [];
	const queryLines = queryOutput
		.split("\n")
		.filter((line) => line.includes("capture:"));

	for (const line of queryLines) {
		const match = line.match(
			/capture: \d+ - ([^,]+), start: \((\d+), (\d+)\), end: \((\d+), (\d+)\), text: `([^`]*)`/,
		);
		if (match) {
			const [, type, startRow, startCol, endRow, endCol, text] = match;
			highlights.push({
				type: type.trim(),
				startRow: parseInt(startRow),
				startCol: parseInt(startCol),
				endRow: parseInt(endRow),
				endCol: parseInt(endCol),
				text: text,
			});
		}
	}

	// Sort highlights by position
	highlights.sort((a, b) => {
		if (a.startRow !== b.startRow) return a.startRow - b.startRow;
		return a.startCol - b.startCol;
	});

	// Apply highlighting to each line
	const highlightedLines = [];
	for (let i = 0; i < lines.length; i++) {
		let line = lines[i];
		let highlightedLine = "";
		let pos = 0;

		// Find highlights for this line
		const lineHighlights = highlights.filter((h) => h.startRow === i);

		for (const highlight of lineHighlights) {
			// Add unhighlighted text before this highlight
			highlightedLine += line.slice(pos, highlight.startCol);

			// Special handling for content_line (simulate injection)
			if (highlight.type === "string" && highlight.text.includes("=")) {
				// This looks like CCL content within a content_line - enhance it
				const enhanced = highlightCCLLine(highlight.text);
				highlightedLine += enhanced;
			} else {
				// Regular highlighting
				const color = highlightColors[highlight.type] || colors.reset;
				highlightedLine += color + highlight.text + colors.reset;
			}

			pos = highlight.endCol;
		}

		// Add remaining unhighlighted text
		highlightedLine += line.slice(pos);
		highlightedLines.push(highlightedLine);
	}

	// Output the syntax-highlighted content
	console.log(highlightedLines.join("\n"));
} catch (error) {
	console.error("Query compilation failed:", error.message);
	// Fallback: just output the raw content if highlighting fails
	console.log(code);
}

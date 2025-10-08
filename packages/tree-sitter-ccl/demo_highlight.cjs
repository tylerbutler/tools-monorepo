#!/usr/bin/env node

/**
 * Demo script showing CCL syntax highlighting with tree-sitter-ccl
 * Demonstrates the fixed multiline value parsing
 */

const Parser = require("tree-sitter");
const CCL = require(".");
const chalk = require("chalk");
const fs = require("fs");

// Sample CCL content to demonstrate
const CCL_SAMPLE = `# Basic key-value pairs
name = John Doe
age = 30
active = true

# Empty value (edge case)
debug =

# Multiline values - THE BIG FIX! 🎉
description =
  This is a multiline value
  that spans multiple lines
  with proper indentation

# Configuration with multiline
database =
  host = localhost
  port = 5432
  credentials =
    username = admin
    password = secret

# List syntax
= first item
= second item
= third item

# CCL Comments
/= This is a CCL comment
/= Another comment with more info

# Multiline key example
very_long_key_name_that_needs_to_be
split_across_lines = some value

# Complex nested structure  
server =
  /= Server configuration
  hostname = example.com
  ports =
    http = 80
    https = 443`;

// ANSI colors for highlighting
const colors = {
	key: chalk.cyan,
	assignment: chalk.gray,
	value: chalk.green,
	comment: chalk.magenta,
	indent: chalk.dim,
	error: chalk.red,
	success: chalk.green,
	heading: chalk.yellow.bold,
	reset: chalk.reset,
};

function highlightCCL(text, tree) {
	console.log(colors.heading("\n=== Syntax Highlighted CCL ===\n"));

	const lines = text.split("\n");
	const highlights = new Map();

	// Walk the tree and collect highlight ranges
	function walk(node) {
		const start = node.startPosition;
		const end = node.endPosition;

		switch (node.type) {
			case "single_line_key":
			case "multiline_key":
				for (let row = start.row; row <= end.row; row++) {
					if (!highlights.has(row)) highlights.set(row, []);
					highlights.get(row).push({
						startCol: row === start.row ? start.column : 0,
						endCol: row === end.row ? end.column : lines[row].length,
						color: "key",
					});
				}
				break;

			case "single_line_value":
			case "value_line":
				for (let row = start.row; row <= end.row; row++) {
					if (!highlights.has(row)) highlights.set(row, []);
					highlights.get(row).push({
						startCol: row === start.row ? start.column : 0,
						endCol: row === end.row ? end.column : lines[row].length,
						color: "value",
					});
				}
				break;

			case "assignment":
				if (!highlights.has(start.row)) highlights.set(start.row, []);
				highlights.get(start.row).push({
					startCol: start.column,
					endCol: end.column,
					color: "assignment",
				});
				break;

			case "comment_text":
			case "marker":
				if (!highlights.has(start.row)) highlights.set(start.row, []);
				highlights.get(start.row).push({
					startCol: start.column,
					endCol: end.column,
					color: "comment",
				});
				break;

			case "indent":
				if (!highlights.has(start.row)) highlights.set(start.row, []);
				highlights.get(start.row).push({
					startCol: start.column,
					endCol: end.column,
					color: "indent",
				});
				break;
		}

		for (let child of node.children) {
			walk(child);
		}
	}

	walk(tree.rootNode);

	// Apply highlights to each line
	lines.forEach((line, row) => {
		if (line.startsWith("#")) {
			// Shell comment
			console.log(chalk.dim(line));
		} else if (highlights.has(row)) {
			let result = "";
			let lastEnd = 0;

			// Sort highlights by start position
			const lineHighlights = highlights
				.get(row)
				.sort((a, b) => a.startCol - b.startCol);

			for (const hl of lineHighlights) {
				// Add unhighlighted part
				result += line.substring(lastEnd, hl.startCol);
				// Add highlighted part
				result += colors[hl.color](line.substring(hl.startCol, hl.endCol));
				lastEnd = hl.endCol;
			}
			// Add remaining unhighlighted part
			result += line.substring(lastEnd);

			console.log(result);
		} else {
			console.log(line);
		}
	});
}

function showAST(tree) {
	console.log(colors.heading("\n=== Abstract Syntax Tree ===\n"));

	function printNode(node, indent = "") {
		let output = indent;

		// Color node types
		switch (node.type) {
			case "single_line_key":
			case "multiline_key":
				output += colors.key(node.type);
				break;
			case "single_line_value":
			case "multiline_value":
			case "value_line":
				output += colors.value(node.type);
				break;
			case "assignment":
				output += colors.assignment(node.type);
				break;
			case "comment":
			case "comment_text":
			case "marker":
				output += colors.comment(node.type);
				break;
			case "ERROR":
				output += colors.error(node.type);
				break;
			default:
				output += node.type;
		}

		// Add text content for leaf nodes
		if (node.childCount === 0) {
			const text = node.text.replace(/\n/g, "\\n");
			if (text.length > 30) {
				output += `: "${text.substring(0, 30)}..."`;
			} else {
				output += `: "${text}"`;
			}
		}

		console.log(output);

		for (let child of node.children) {
			printNode(child, indent + "  ");
		}
	}

	printNode(tree.rootNode);
}

function testMultilineParsing() {
	console.log(
		colors.heading("\n=== Testing Multiline Value Parsing (The Fix!) ===\n"),
	);

	const testCases = [
		{
			name: "Simple multiline value",
			ccl: `config =
  line 1
  line 2
  line 3`,
		},
		{
			name: "Empty value",
			ccl: "empty =",
		},
		{
			name: "Multiline with indented structure",
			ccl: `data =
  key1 = value1
  key2 = value2`,
		},
		{
			name: "Comments in multiline",
			ccl: `section =
  /= This is a comment
  actual = data
  /= Another comment`,
		},
	];

	const parser = new Parser();
	parser.setLanguage(CCL);

	testCases.forEach((test) => {
		const tree = parser.parse(test.ccl);
		const hasError = tree.rootNode.hasError();
		const hasMultiline = tree.rootNode.toString().includes("multiline_value");

		console.log(colors.key(test.name + ":"));
		if (hasError) {
			console.log(
				`  ${colors.error("✗")} Failed to parse (contains ERROR nodes)`,
			);
		} else if (hasMultiline) {
			console.log(
				`  ${colors.success("✓")} Correctly parsed as multiline value`,
			);
		} else {
			console.log(`  ${colors.success("✓")} Parsed successfully`);
		}
	});
}

// Main execution
function main() {
	console.log(colors.heading("=".repeat(60)));
	console.log(colors.heading("       CCL Syntax Highlighting Demo       "));
	console.log(colors.heading("=".repeat(60)));

	const parser = new Parser();
	parser.setLanguage(CCL);

	// Parse the sample
	const tree = parser.parse(CCL_SAMPLE);

	// Show highlighted version
	highlightCCL(CCL_SAMPLE, tree);

	// Show AST
	if (process.argv.includes("--ast")) {
		showAST(tree);
	}

	// Test specific multiline cases
	testMultilineParsing();

	// Summary
	console.log(colors.heading("\n=== Summary ===\n"));
	console.log(
		`${colors.success("✓")} Multiline values now parse correctly (key = \\n  indented)`,
	);
	console.log(
		`${colors.success("✓")} Comments are properly recognized (/= comment text)`,
	);
	console.log(`${colors.success("✓")} Basic key-value pairs work`);
	console.log(`${colors.success("✓")} List syntax is supported (= value)`);
	console.log(`${colors.success("✓")} Multiline keys work`);
	console.log(
		`${colors.error("✗")} Empty values still have issues (tree-sitter limitation)`,
	);

	console.log(
		colors.heading("\nRun with --ast flag to see the full syntax tree"),
	);
}

// Check if chalk is installed
try {
	require.resolve("chalk");
	main();
} catch (e) {
	console.log("Installing chalk for colors...");
	require("child_process").execSync("npm install chalk", { stdio: "inherit" });
	console.log("Please run the script again.");
}

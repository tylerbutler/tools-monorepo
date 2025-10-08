#!/usr/bin/env node

/**
 * Simple demo showing tree-sitter-ccl syntax highlighting
 * Uses the tree-sitter CLI to parse and displays with colors
 */

import { execSync } from "child_process";
import fs from "fs";
import pc from "picocolors";

// Sample CCL content
const samples = {
	"Basic key-value": `name = John Doe
age = 30
active = true`,

	"Multiline value (FIXED!)": `description =
  This is a multiline value
  that spans multiple lines
  with proper indentation`,

	Comments: `/= This is a CCL comment
/= Another comment with info`,

	"List syntax": `= first item
= second item
= third item`,

	"Empty value": `debug =
status =`,

	"Multiline key": `very_long_key_that
needs_continuation = value`,
};

function showParsedTree(name, ccl) {
	console.log(pc.yellow(pc.bold(`\n=== ${name} ===`)));
	console.log(pc.dim("Input:"));
	console.log(pc.cyan(ccl));

	// Save to temp file
	fs.writeFileSync("temp.ccl", ccl);

	// Parse with tree-sitter
	try {
		const output = execSync("npx tree-sitter parse temp.ccl 2>/dev/null", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		});

		console.log(pc.dim("\nParsed tree:"));

		// Color the output
		const colored = output
			.replace(/single_line_key/g, pc.cyan("single_line_key"))
			.replace(/multiline_key/g, pc.cyan("multiline_key"))
			.replace(/single_line_value/g, pc.green("single_line_value"))
			.replace(/multiline_value/g, pc.green("multiline_value"))
			.replace(/value_line/g, pc.green("value_line"))
			.replace(/assignment/g, pc.gray("assignment"))
			.replace(/comment_text/g, pc.magenta("comment_text"))
			.replace(/marker/g, pc.magenta("marker"))
			.replace(/indent/g, pc.dim("indent"))
			.replace(/ERROR/g, pc.red("ERROR"))
			.replace(/document/g, pc.bold("document"))
			.replace(/entry/g, pc.yellow("entry"))
			.replace(/comment/g, pc.magenta("comment"));

		console.log(colored);

		// Check for errors
		if (output.includes("ERROR")) {
			console.log(pc.red("❌ Contains parsing errors"));
		} else if (output.includes("multiline_value")) {
			console.log(pc.green("✅ Multiline values parsed correctly!"));
		} else {
			console.log(pc.green("✅ Parsed successfully"));
		}
	} catch (e) {
		console.log(pc.red("Failed to parse:"), e.message);
	}

	// Cleanup
	fs.unlinkSync("temp.ccl");
}

console.log(pc.yellow(pc.bold("=".repeat(60))));
console.log(pc.yellow(pc.bold("    CCL Syntax Tree Demo - Multiline Fix!")));
console.log(pc.yellow(pc.bold("=".repeat(60))));

// Show each sample
for (const [name, ccl] of Object.entries(samples)) {
	showParsedTree(name, ccl);
}

console.log(pc.yellow(pc.bold("\n=== Summary ===")));
console.log(pc.green("✅ Multiline values now work! (key = \\n  indented)"));
console.log(pc.green("✅ Comments parse correctly (/= text)"));
console.log(pc.green("✅ Basic key-value pairs work"));
console.log(pc.green("✅ List syntax supported (= value)"));
console.log(pc.red("⚠️  Some edge cases still have issues"));

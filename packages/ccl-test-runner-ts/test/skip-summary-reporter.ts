/**
 * Custom vitest reporter that summarizes skipped tests by category.
 *
 * Collects skip reasons from `context.skip(reason)` calls and groups them
 * for a summary at the end of the test run.
 */
import type { Reporter, TestCase, TestModule } from "vitest/node";

/**
 * Categories for skip reasons.
 */
type SkipCategory =
	| "function"
	| "feature"
	| "behavior"
	| "variant"
	| "conflict"
	| "other";

/**
 * Parsed skip reason with category and detail.
 */
interface ParsedSkipReason {
	category: SkipCategory;
	detail: string;
}

/**
 * Parse a skip note into category and detail.
 *
 * Expected formats:
 * - "function:parse" → category: function, detail: parse
 * - "Missing required functions: parse, build_hierarchy" → category: function, detail: parse, build_hierarchy
 * - "Behavior conflict: ..." → category: behavior, detail: ...
 */
function parseSkipNote(note: string): ParsedSkipReason {
	const lowerNote = note.toLowerCase();

	// Check for "category:detail" format
	const colonIndex = note.indexOf(":");
	if (colonIndex > 0) {
		const prefix = note.slice(0, colonIndex).toLowerCase().trim();
		const detail = note.slice(colonIndex + 1).trim();

		// Direct category match
		if (prefix === "function") {
			return { category: "function", detail };
		}
		if (prefix === "feature") {
			return { category: "feature", detail };
		}
		if (prefix === "behavior") {
			return { category: "behavior", detail };
		}
		if (prefix === "variant") {
			return { category: "variant", detail };
		}

		// Phrase-based matching
		if (prefix.includes("function")) {
			return { category: "function", detail };
		}
		if (prefix.includes("feature")) {
			return { category: "feature", detail };
		}
		if (prefix.includes("behavior")) {
			return { category: "behavior", detail };
		}
		if (prefix.includes("variant")) {
			return { category: "variant", detail };
		}
		if (prefix.includes("conflict")) {
			return { category: "conflict", detail };
		}
	}

	// Fallback: detect category from content
	if (lowerNote.includes("function")) {
		return { category: "function", detail: note };
	}
	if (lowerNote.includes("feature")) {
		return { category: "feature", detail: note };
	}
	if (lowerNote.includes("behavior")) {
		return { category: "behavior", detail: note };
	}
	if (lowerNote.includes("variant")) {
		return { category: "variant", detail: note };
	}
	if (lowerNote.includes("conflict")) {
		return { category: "conflict", detail: note };
	}

	return { category: "other", detail: note };
}

/**
 * Reporter that collects and summarizes skip reasons.
 */
export default class SkipSummaryReporter implements Reporter {
	private skippedByReason = new Map<string, number>();
	private todoCount = 0;
	private passedCount = 0;
	private failedCount = 0;
	private skippedCount = 0;

	onTestCaseResult(testCase: TestCase): void {
		const result = testCase.result();

		switch (result.state) {
			case "passed":
				this.passedCount++;
				break;
			case "failed":
				this.failedCount++;
				break;
			case "skipped":
				// Check if it's a todo vs regular skip
				if (testCase.options.mode === "todo") {
					this.todoCount++;
				} else {
					this.skippedCount++;
					// Track the skip reason
					const note = result.note ?? "No reason provided";
					const { category, detail } = parseSkipNote(note);
					const key = `${category}:${detail}`;
					this.skippedByReason.set(
						key,
						(this.skippedByReason.get(key) ?? 0) + 1,
					);
				}
				break;
		}
	}

	onTestRunEnd(_testModules: ReadonlyArray<TestModule>): void {
		this.printSummary();
	}

	private printSummary(): void {
		if (this.skippedCount === 0 && this.todoCount === 0) {
			return;
		}

		// Group by category
		const byCategory = new Map<SkipCategory, Map<string, number>>();

		for (const [key, count] of this.skippedByReason) {
			const colonIndex = key.indexOf(":");
			const category = key.slice(0, colonIndex) as SkipCategory;
			const detail = key.slice(colonIndex + 1);

			if (!byCategory.has(category)) {
				byCategory.set(category, new Map());
			}
			byCategory.get(category)!.set(detail, count);
		}

		// Print header
		console.log("\n");
		console.log("┌" + "─".repeat(62) + "┐");
		console.log("│" + "  CCL Test Summary".padEnd(62) + "│");
		console.log("├" + "─".repeat(62) + "┤");

		// Print category summaries
		const categoryLabels: Record<SkipCategory, string> = {
			function: "Unsupported Functions",
			feature: "Missing Features",
			behavior: "Behavior Conflicts",
			variant: "Variant Mismatches",
			conflict: "Other Conflicts",
			other: "Other Reasons",
		};

		const categoryOrder: SkipCategory[] = [
			"function",
			"feature",
			"behavior",
			"variant",
			"conflict",
			"other",
		];

		let hasSkipDetails = false;

		for (const category of categoryOrder) {
			const details = byCategory.get(category);
			if (!details || details.size === 0) continue;

			hasSkipDetails = true;
			const categoryTotal = [...details.values()].reduce(
				(sum, count) => sum + count,
				0,
			);

			console.log(
				"│" +
					`  ${categoryLabels[category]}`.padEnd(50) +
					`${categoryTotal}`.padStart(10) +
					"  │",
			);

			// Sort by count descending, show top items
			const sortedDetails = [...details.entries()]
				.sort((a, b) => b[1] - a[1])
				.slice(0, 5); // Show top 5

			for (const [detail, count] of sortedDetails) {
				const truncatedDetail =
					detail.length > 40 ? detail.slice(0, 37) + "..." : detail;
				console.log(
					"│" +
						`    └─ ${truncatedDetail}`.padEnd(50) +
						`${count}`.padStart(10) +
						"  │",
				);
			}

			if (details.size > 5) {
				console.log(
					"│" +
						`    └─ ... and ${details.size - 5} more`.padEnd(50) +
						"".padStart(10) +
						"  │",
				);
			}
		}

		if (!hasSkipDetails && this.skippedCount > 0) {
			console.log(
				"│" +
					"  Skipped (no reason)".padEnd(50) +
					`${this.skippedCount}`.padStart(10) +
					"  │",
			);
		}

		// Print totals
		console.log("├" + "─".repeat(62) + "┤");
		console.log(
			"│" +
				"  Passed".padEnd(50) +
				`${this.passedCount}`.padStart(10) +
				"  │",
		);
		console.log(
			"│" +
				"  Failed".padEnd(50) +
				`${this.failedCount}`.padStart(10) +
				"  │",
		);
		console.log(
			"│" +
				"  Skipped".padEnd(50) +
				`${this.skippedCount}`.padStart(10) +
				"  │",
		);
		console.log(
			"│" + "  Todo".padEnd(50) + `${this.todoCount}`.padStart(10) + "  │",
		);
		console.log("├" + "─".repeat(62) + "┤");

		const total =
			this.passedCount + this.failedCount + this.skippedCount + this.todoCount;
		console.log(
			"│" + "  Total".padEnd(50) + `${total}`.padStart(10) + "  │",
		);
		console.log("└" + "─".repeat(62) + "┘");
		console.log("");
	}
}

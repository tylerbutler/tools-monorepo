import { writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	type CargoToml,
	defineCargoPolicy,
} from "../policyDefiners/defineCargoPolicy.js";

/**
 * Configuration for the CargoTomlSorted policy.
 *
 * @alpha
 */
export interface CargoTomlSortedConfig {
	/**
	 * Sections whose keys should be sorted alphabetically.
	 * @defaultValue ["dependencies", "dev-dependencies", "build-dependencies"]
	 */
	sections?: string[];
}

const DEFAULT_SORTED_SECTIONS = [
	"dependencies",
	"dev-dependencies",
	"build-dependencies",
];

function isSorted(keys: string[]): boolean {
	for (let i = 1; i < keys.length; i++) {
		const current = keys[i];
		const previous = keys[i - 1];
		if (current !== undefined && previous !== undefined && current < previous) {
			return false;
		}
	}
	return true;
}

const SECTION_HEADER_REGEX = /^\[([^\]]+)\]\s*$/;
const NEXT_SECTION_REGEX = /^\[/;
const KEY_VALUE_REGEX = /^(\S+)\s*=/;

/**
 * Process a single line in a dependency section, updating entries and current state.
 */
function processEntryLine(
	entryLine: string,
	entries: { key: string; lines: string[] }[],
	currentEntry: { key: string; lines: string[] } | undefined,
): { key: string; lines: string[] } | undefined {
	// Comment line - attach to next entry
	if (entryLine.trim().startsWith("#")) {
		if (currentEntry) {
			currentEntry.lines.push(entryLine);
		} else {
			return { key: "", lines: [entryLine] };
		}
		return currentEntry;
	}
	// Key = value line
	const keyMatch = entryLine.match(KEY_VALUE_REGEX);
	if (keyMatch) {
		if (currentEntry) {
			entries.push(currentEntry);
		}
		const key = keyMatch[1] ?? "";
		return { key, lines: [entryLine] };
	}
	if (currentEntry) {
		// Continuation line (multiline value)
		currentEntry.lines.push(entryLine);
	}
	return currentEntry;
}

/**
 * Collect sorted entries from a TOML dependency section.
 */
function collectAndSortEntries(
	lines: string[],
	startIndex: number,
): { entries: { key: string; lines: string[] }[]; nextIndex: number } {
	const entries: { key: string; lines: string[] }[] = [];
	let currentEntry: { key: string; lines: string[] } | undefined;
	let i = startIndex;

	while (i < lines.length) {
		const entryLine = lines[i];
		if (entryLine === undefined) {
			break;
		}
		// Stop at next section
		if (NEXT_SECTION_REGEX.test(entryLine)) {
			break;
		}
		// Skip pure blank lines between entries
		if (entryLine.trim() === "") {
			i++;
			continue;
		}

		currentEntry = processEntryLine(entryLine, entries, currentEntry);
		i++;
	}
	if (currentEntry) {
		entries.push(currentEntry);
	}

	entries.sort((a, b) => a.key.localeCompare(b.key));
	return { entries, nextIndex: i };
}

/**
 * Rebuild TOML content with sorted dependency sections.
 * Uses line-based manipulation to preserve formatting and comments.
 */
function sortTomlSections(content: string, sectionsToSort: string[]): string {
	const lines = content.split("\n");
	const result: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		if (line === undefined) {
			break;
		}
		const sectionMatch = line.match(SECTION_HEADER_REGEX);

		if (sectionMatch) {
			const sectionName = sectionMatch[1] ?? "";
			if (sectionsToSort.includes(sectionName)) {
				result.push(line);
				i++;

				const { entries, nextIndex } = collectAndSortEntries(lines, i);
				for (const entry of entries) {
					result.push(...entry.lines);
				}
				i = nextIndex;
				continue;
			}
		}

		result.push(line);
		i++;
	}

	return result.join("\n");
}

/**
 * A policy that ensures dependency sections in Cargo.toml are sorted alphabetically.
 *
 * @alpha
 */
export const CargoTomlSorted: PolicyShape<CargoTomlSortedConfig> =
	defineCargoPolicy({
		name: "CargoTomlSorted",
		description:
			"Ensures dependency sections in Cargo.toml are sorted alphabetically.",
		handler: async (
			toml: CargoToml,
			{ file, root, resolve: shouldResolve, config },
		) => {
			const sections = config?.sections ?? DEFAULT_SORTED_SECTIONS;
			const unsortedSections: string[] = [];

			for (const section of sections) {
				const sectionData = toml[section] as
					| Record<string, unknown>
					| undefined;
				if (sectionData !== undefined) {
					const keys = Object.keys(sectionData);
					if (!isSorted(keys)) {
						unsortedSections.push(section);
					}
				}
			}

			if (unsortedSections.length === 0) {
				return true;
			}

			if (shouldResolve) {
				try {
					const { readFile } = await import("node:fs/promises");
					const filePath = resolve(root, file);
					const content = await readFile(filePath, "utf-8");
					const sorted = sortTomlSections(content, unsortedSections);
					await writeFile(filePath, sorted);
					return {
						error: `Unsorted sections: [${unsortedSections.join("], [")}]`,
						fixable: true,
						fixed: true,
					};
				} catch {
					return {
						error: `Unsorted sections: [${unsortedSections.join("], [")}]. Auto-fix failed.`,
						fixable: true,
						fixed: false,
					};
				}
			}

			return {
				error: `Unsorted sections: [${unsortedSections.join("], [")}]`,
				fixable: true,
				manualFix:
					"Sort the dependency keys alphabetically in the listed sections.",
			};
		},
	});

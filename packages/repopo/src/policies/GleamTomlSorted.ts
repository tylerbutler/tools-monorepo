import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "pathe";
import type { PolicyShape } from "../policy.js";
import {
	defineGleamPolicy,
	type GleamToml,
} from "../policyDefiners/defineGleamPolicy.js";

/**
 * Configuration for the GleamTomlSorted policy.
 *
 * @alpha
 */
export interface GleamTomlSortedConfig {
	/**
	 * Sections whose keys should be sorted alphabetically.
	 * @defaultValue ["dependencies", "dev-dependencies"]
	 */
	sections?: string[];
}

const DEFAULT_SORTED_SECTIONS = ["dependencies", "dev-dependencies"];

const SECTION_HEADER_REGEX = /^\[([^\]]+)\]\s*$/;
const KEY_VALUE_REGEX = /^(\S+)\s*=/;

function isSorted(keys: string[]): boolean {
	for (let i = 1; i < keys.length; i++) {
		const prev = keys[i - 1];
		const curr = keys[i];
		if (prev !== undefined && curr !== undefined && curr < prev) {
			return false;
		}
	}
	return true;
}

interface TomlEntry {
	key: string;
	lines: string[];
}

function classifyLine(
	line: string,
): "section" | "blank" | "comment" | "key" | "continuation" {
	if (SECTION_HEADER_REGEX.test(line)) {
		return "section";
	}
	if (line.trim() === "") {
		return "blank";
	}
	if (line.trim().startsWith("#")) {
		return "comment";
	}
	if (KEY_VALUE_REGEX.test(line)) {
		return "key";
	}
	return "continuation";
}

function handleCommentLine(
	entryLine: string,
	currentEntry: TomlEntry | undefined,
): TomlEntry {
	if (currentEntry) {
		currentEntry.lines.push(entryLine);
		return currentEntry;
	}
	return { key: "", lines: [entryLine] };
}

function processKeyLine(
	entryLine: string,
	currentEntry: TomlEntry | undefined,
	entries: TomlEntry[],
): TomlEntry {
	if (currentEntry) {
		entries.push(currentEntry);
	}
	const keyMatch = entryLine.match(KEY_VALUE_REGEX);
	return { key: keyMatch?.[1] ?? "", lines: [entryLine] };
}

function collectSectionEntries(
	lines: string[],
	startIndex: number,
): { entries: TomlEntry[]; endIndex: number } {
	const entries: TomlEntry[] = [];
	let currentEntry: TomlEntry | undefined;
	let i = startIndex;

	while (i < lines.length) {
		const entryLine = lines[i] ?? "";
		const kind = classifyLine(entryLine);

		if (kind === "section") {
			break;
		}

		switch (kind) {
			case "blank": {
				break;
			}
			case "comment": {
				currentEntry = handleCommentLine(entryLine, currentEntry);
				break;
			}
			case "key": {
				currentEntry = processKeyLine(entryLine, currentEntry, entries);
				break;
			}
			case "continuation": {
				currentEntry?.lines.push(entryLine);
				break;
			}
			default: {
				break;
			}
		}
		i++;
	}
	if (currentEntry) {
		entries.push(currentEntry);
	}
	return { entries, endIndex: i };
}

function sortTomlSections(content: string, sectionsToSort: string[]): string {
	const lines = content.split("\n");
	const result: string[] = [];
	let i = 0;

	while (i < lines.length) {
		const line = lines[i] ?? "";
		const sectionMatch = line.match(SECTION_HEADER_REGEX);

		if (sectionMatch && sectionsToSort.includes(sectionMatch[1] ?? "")) {
			result.push(line);
			i++;
			const { entries, endIndex } = collectSectionEntries(lines, i);
			entries.sort((a, b) => a.key.localeCompare(b.key));
			for (const entry of entries) {
				result.push(...entry.lines);
			}
			i = endIndex;
			continue;
		}

		result.push(line);
		i++;
	}

	return result.join("\n");
}

/**
 * A policy that ensures dependency sections in gleam.toml are sorted alphabetically.
 *
 * @alpha
 */
export const GleamTomlSorted: PolicyShape<GleamTomlSortedConfig> =
	defineGleamPolicy({
		name: "GleamTomlSorted",
		description:
			"Ensures dependency sections in gleam.toml are sorted alphabetically.",
		handler: async (
			toml: GleamToml,
			{ file, root, resolve: shouldResolve, config },
		) => {
			const sections = config?.sections ?? DEFAULT_SORTED_SECTIONS;
			const unsortedSections: string[] = [];

			for (const section of sections) {
				const sectionData = toml[section] as
					| Record<string, unknown>
					| undefined;
				if (sectionData !== undefined && !isSorted(Object.keys(sectionData))) {
					unsortedSections.push(section);
				}
			}

			if (unsortedSections.length === 0) {
				return true;
			}

			if (shouldResolve) {
				try {
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

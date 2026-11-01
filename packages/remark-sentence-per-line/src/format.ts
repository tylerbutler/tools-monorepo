import type { Nodes, Paragraph, PhrasingContent } from "mdast";
import { decodeString } from "micromark-util-decode-string";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { SentenceSplitterSyntax, split } from "sentence-splitter";
import { unified } from "unified";

export interface SentencePerLineOptions {
	/** BCP 47 language tag. Defaults to English (`en`). */
	locale?: string;
}

export interface MarkdownEdit {
	/** Inclusive UTF-16 offset in the original source. */
	start: number;
	/** Exclusive UTF-16 offset in the original source. */
	end: number;
	newText: string;
}

interface Gap {
	index: number;
	start: number;
	end: number;
}

interface Projection {
	text: string;
	starts: number[];
	ends: number[];
	gaps: Gap[];
}

const parser = unified()
	.use(remarkParse)
	.use(remarkGfm)
	.use(remarkFrontmatter, ["yaml", "toml"]);
const lineEndingPattern = /\r\n|\n|\r/;
const whitespacePattern = /^[ \t\r\n]/;
const softBreakPrefixPattern = /^(?:[ \t]*>[ \t]?)*[ \t]*/;
const escapeOrEntityPattern =
	/^(?:\\[!-/:-@[-`{-~]|&(?:#[xX][\dA-Fa-f]{1,6}|#\d{1,7}|[A-Za-z][\dA-Za-z]{1,31});)/;
const listMarkerPattern = /(?:[*+-]|\d+[.)])([ \t]+)/g;
const taskMarkerPattern = /\[[ xX]\][ \t]+$/;
const footnoteMarkerPattern = /\[\^[^\]]+\]:[ \t]+/g;
const textWhitespacePattern = /[ \t\r\n]+/g;

function append(
	projection: Projection,
	value: string,
	start: number,
	end: number,
): void {
	projection.text += value;
	let remaining = value.length;
	while (remaining > 0) {
		projection.starts.push(start);
		projection.ends.push(end);
		remaining--;
	}
}

function readGap(source: string, start: number, limit: number): number {
	let end = start;
	while (end < limit && whitespacePattern.test(source.slice(end, end + 1))) {
		const lineEnding = source
			.slice(end, Math.min(end + 2, limit))
			.match(lineEndingPattern);
		if (lineEnding?.index === 0) {
			end += lineEnding[0].length;
			end +=
				source.slice(end, limit).match(softBreakPrefixPattern)?.[0].length ?? 0;
		} else {
			end++;
		}
	}
	return end;
}

function projectText(
	projection: Projection,
	source: string,
	start: number,
	end: number,
): void {
	let offset = start;
	while (offset < end) {
		if (whitespacePattern.test(source.slice(offset, offset + 1))) {
			const gapEnd = readGap(source, offset, end);
			projection.gaps.push({
				index: projection.text.length,
				start: offset,
				end: gapEnd,
			});
			append(projection, " ", offset, gapEnd);
			offset = gapEnd;
		} else {
			const token =
				source.slice(offset, end).match(escapeOrEntityPattern)?.[0] ??
				source.slice(offset, offset + 1);
			append(projection, decodeString(token), offset, offset + token.length);
			offset += token.length;
		}
	}
}

function visibleText(node: PhrasingContent): string {
	if (node.type === "text") {
		return node.value.replace(textWhitespacePattern, " ");
	}
	if ("children" in node) {
		return node.children.map(visibleText).join("");
	}
	return "\uFFFC";
}

function projectInline(
	projection: Projection,
	source: string,
	node: PhrasingContent,
): void {
	const start = node.position?.start.offset;
	const end = node.position?.end.offset;
	if (start === undefined || end === undefined) {
		return;
	}
	if (node.type === "text") {
		projectText(projection, source, start, end);
		return;
	}
	if (node.type === "break") {
		append(projection, "\n", start, end);
		return;
	}
	if (node.type === "html") {
		if (projection.ends.length > 0) {
			projection.ends[projection.ends.length - 1] = end;
		}
		return;
	}

	const first = projection.text.length;
	if (
		node.type === "emphasis" ||
		node.type === "strong" ||
		node.type === "delete"
	) {
		for (const child of node.children) {
			projectInline(projection, source, child);
		}
	} else {
		// Links and other opaque constructs contribute text, but no editable gaps.
		append(projection, visibleText(node), start, end);
	}
	if (projection.text.length > first) {
		projection.starts[first] = start;
		projection.ends[projection.ends.length - 1] = end;
	}
}

function sentenceStarts(text: string, locale: string): Set<number> {
	const language = new Intl.Locale(locale).language;
	if (language === "en" || language === "ja") {
		const starts = split(text)
			.filter((node) => node.type === SentenceSplitterSyntax.Sentence)
			.map(
				(node) => node.range[0] + node.raw.length - node.raw.trimStart().length,
			);
		return new Set(starts.slice(1));
	}
	const segments = new Intl.Segmenter(locale, { granularity: "sentence" });
	return new Set(
		Array.from(
			segments.segment(text),
			({ index, segment }) =>
				index + segment.length - segment.trimStart().length,
		).slice(1),
	);
}

function continuationPrefix(source: string, start: number): string {
	const lineStart =
		Math.max(
			source.lastIndexOf("\n", start - 1),
			source.lastIndexOf("\r", start - 1),
		) + 1;
	return source
		.slice(lineStart, start)
		.replace(taskMarkerPattern, "")
		.replace(footnoteMarkerPattern, "    ")
		.replace(listMarkerPattern, (marker: string, spacing: string) => {
			return " ".repeat(marker.length - spacing.length) + spacing;
		});
}

function paragraphEdits(
	source: string,
	node: Paragraph,
	locale: string,
	lineEnding: string,
): MarkdownEdit[] {
	const projection: Projection = { text: "", starts: [], ends: [], gaps: [] };
	for (const child of node.children) {
		projectInline(projection, source, child);
	}
	const boundaries = sentenceStarts(projection.text, locale);
	const prefix = continuationPrefix(source, node.position?.start.offset ?? 0);
	const edits: MarkdownEdit[] = [];
	for (const gap of projection.gaps) {
		const raw = source.slice(gap.start, gap.end);
		const hasLineEnding = lineEndingPattern.test(raw);
		const isBoundary = boundaries.has(gap.index + 1);
		if (isBoundary && !hasLineEnding) {
			edits.push({
				start: gap.start,
				end: gap.end,
				newText: lineEnding + prefix,
			});
		} else if (!isBoundary && hasLineEnding) {
			edits.push({ start: gap.start, end: gap.end, newText: " " });
		}
	}
	for (const boundary of boundaries) {
		const start = projection.ends[boundary - 1];
		const next = projection.starts[boundary];
		if (
			start !== undefined &&
			start === next &&
			!whitespacePattern.test(projection.text.slice(boundary - 1, boundary))
		) {
			edits.push({ start, end: start, newText: lineEnding + prefix });
		}
	}
	return edits;
}

function collectEdits(
	source: string,
	node: Nodes,
	locale: string,
	lineEnding: string,
): MarkdownEdit[] {
	if (node.type === "paragraph") {
		return paragraphEdits(source, node, locale, lineEnding);
	}
	if (
		node.type === "root" ||
		node.type === "blockquote" ||
		node.type === "list" ||
		node.type === "listItem" ||
		node.type === "footnoteDefinition"
	) {
		return node.children.flatMap((child) =>
			collectEdits(source, child, locale, lineEnding),
		);
	}
	return [];
}

function applyEdits(source: string, edits: MarkdownEdit[]): string {
	const parts: string[] = [];
	let offset = 0;
	for (const edit of edits) {
		parts.push(source.slice(offset, edit.start), edit.newText);
		offset = edit.end;
	}
	parts.push(source.slice(offset));
	return parts.join("");
}

function structure(source: string): string {
	return JSON.stringify(parser.parse(source), (key: string, value: unknown) => {
		if (key === "position" || key === "data") {
			return undefined;
		}
		if (
			typeof value === "object" &&
			value !== null &&
			"type" in value &&
			value.type === "text" &&
			"value" in value &&
			typeof value.value === "string"
		) {
			return {
				...value,
				value: value.value.replace(textWhitespacePattern, ""),
			};
		}
		return value;
	});
}

/**
 * Return sorted, non-overlapping edits against the original Markdown source.
 * No file-system access is performed. Offsets use UTF-16, as JavaScript and VS Code do.
 */
export function getMarkdownEdits(
	source: string,
	options: SentencePerLineOptions = {},
): MarkdownEdit[] {
	const locale = new Intl.Locale(options.locale ?? "en").toString();
	const lineEnding = source.match(lineEndingPattern)?.[0] ?? "\n";
	const proposed = collectEdits(
		source,
		parser.parse(source),
		locale,
		lineEnding,
	)
		.sort((left, right) => left.start - right.start)
		.filter((edit) => source.slice(edit.start, edit.end) !== edit.newText);
	if (proposed.length === 0) {
		return [];
	}
	const originalStructure = structure(source);
	if (structure(applyEdits(source, proposed)) === originalStructure) {
		return proposed;
	}

	// A new line can turn prose into a heading, list, or other Markdown block.
	const safe: MarkdownEdit[] = [];
	for (const edit of proposed) {
		const candidate = [...safe, edit];
		if (structure(applyEdits(source, candidate)) === originalStructure) {
			safe.push(edit);
		}
	}
	return safe;
}

/** Reflow prose without normalizing the rest of the Markdown source. */
export function formatMarkdown(
	source: string,
	options: SentencePerLineOptions = {},
): string {
	return applyEdits(source, getMarkdownEdits(source, options));
}

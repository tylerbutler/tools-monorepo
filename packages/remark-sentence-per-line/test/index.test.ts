import type { Root } from "mdast";
import { remark } from "remark";
import remarkParse from "remark-parse";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { describe, expect, it } from "vitest";
import {
	formatMarkdown,
	getMarkdownEdits,
	type SentencePerLineOptions,
} from "../src/format.js";
import { remarkSentencePerLine } from "../src/index.js";

describe("source-preserving formatting", () => {
	it.each([
		[
			"First sentence. Second sentence! Third?",
			"First sentence.\nSecond sentence!\nThird?",
		],
		[
			"One sentence\nwrapped across\nthree lines.",
			"One sentence wrapped across three lines.",
		],
		[
			"First.\nSecond.\n\nThird. Fourth.\n",
			"First.\nSecond.\n\nThird.\nFourth.\n",
		],
		[
			"Dr. Smith paid 3.14 dollars. Mr. Jones agreed.",
			"Dr. Smith paid 3.14 dollars.\nMr. Jones agreed.",
		],
		[
			"Use e.g. this example. Then visit https://example.com/a.",
			"Use e.g. this example.\nThen visit https://example.com/a.",
		],
		[
			"**First sentence.** _Second sentence._",
			"**First sentence.**\n_Second sentence._",
		],
		[
			"*A sentence\nwith emphasis.* Next.",
			"*A sentence with emphasis.*\nNext.",
		],
		[
			"Read [the guide.](https://example.com 'Title'). Next.",
			"Read [the guide.](https://example.com 'Title').\nNext.",
		],
		[
			"First&excl; Next&quest; Last&period;",
			"First&excl;\nNext&quest;\nLast&period;",
		],
		["First\\. Next.", "First\\.\nNext."],
		["First.  Second has  two spaces.", "First.\nSecond has  two spaces."],
		["First.\r\nSecond. Third.\r\n", "First.\r\nSecond.\r\nThird.\r\n"],
		["First. Second.\r", "First.\rSecond.\r"],
		["", ""],
	])("formats %j without changing other syntax", (input, expected) => {
		expect(formatMarkdown(input)).toBe(expected);
		expect(formatMarkdown(expected)).toBe(expected);
	});

	it.each([
		["- First. Next.", "- First.\n  Next."],
		["10) First. Next.", "10) First.\n    Next."],
		["- [x] First. Next.", "- [x] First.\n  Next."],
		["> First. Next.", "> First.\n> Next."],
		["> - First. Next.", "> - First.\n>   Next."],
		["- > First. Next.", "- > First.\n  > Next."],
		["> > First. Next.", "> > First.\n> > Next."],
		["- Parent.\n  - First. Next.", "- Parent.\n  - First.\n    Next."],
		[
			"> First sentence\n> wraps here. Next.",
			"> First sentence wraps here.\n> Next.",
		],
		[
			"- First sentence\n  wraps here. Next.",
			"- First sentence wraps here.\n  Next.",
		],
		[
			"- First sentence\nwraps lazily. Next.",
			"- First sentence wraps lazily.\n  Next.",
		],
		["Text.[^a]\n\n[^a]: First. Next.", "Text.[^a]\n\n[^a]: First.\n    Next."],
	])("keeps container structure for %j", (input, expected) => {
		expect(formatMarkdown(input)).toBe(expected);
		expect(formatMarkdown(expected)).toBe(expected);
	});

	it("leaves non-prose blocks and inline syntax unchanged", () => {
		const input = [
			"---",
			"title: First. Second.",
			"---",
			"",
			"## First. Second.",
			"",
			"Setext title. Next.",
			"===================",
			"",
			"~~~markdown",
			"First. Second.",
			"~~~",
			"",
			"    Indented. Code.",
			"",
			"<div>First. Second.</div>",
			"",
			"| Column | Other |",
			"| ------ | ----- |",
			"| First. Second. | Value |",
			"",
			"[ref]: https://example.com 'First. Second.'",
			"",
			"Use `First. Second.` and [First. Second.][ref]. Next.",
			"",
		].join("\n");
		expect(formatMarkdown(input)).toBe(
			input.replace("[ref]. Next.", "[ref].\nNext."),
		);
	});

	it("preserves inline HTML, images, and hard breaks", () => {
		const input =
			"First sentence  \ncontinues here. Next.\\\nStill here. Last with <span>HTML.</span> Next with ![Alt. Text.](image.png). Done.";
		expect(formatMarkdown(input)).toBe(
			"First sentence  \ncontinues here.\nNext.\\\nStill here.\nLast with <span>HTML.</span>\nNext with ![Alt. Text.](image.png).\nDone.",
		);
	});

	it.each([
		"# Heading",
		"- item",
		"1. item",
		"***",
		"```",
		"> quote",
	])("does not turn sentence text into a Markdown block: %s", (next) => {
		const input = `First. ${next}`;
		expect(formatMarkdown(input)).toBe(input);
	});

	it("keeps safe edits when another sentence cannot safely start a line", () => {
		expect(formatMarkdown("First. # Not a heading. Last.")).toBe(
			"First. # Not a heading.\nLast.",
		);
	});

	it.each([
		[{ locale: "en-GB" }, "Dr. Smith left. Next.", "Dr. Smith left.\nNext."],
		[
			{ locale: "ja" },
			"最初の文。次の文！最後？",
			"最初の文。\n次の文！\n最後？",
		],
		[{ locale: "de" }, "Ein Satz. Noch ein Satz!", "Ein Satz.\nNoch ein Satz!"],
		[{ locale: "zh" }, "第一句。第二句。", "第一句。\n第二句。"],
	] satisfies [
		SentencePerLineOptions,
		string,
		string,
	][])("supports locale %j", (options, input, expected) => {
		expect(formatMarkdown(input, options)).toBe(expected);
		expect(formatMarkdown(expected, options)).toBe(expected);
	});

	it("rejects malformed locales", () => {
		expect(() =>
			formatMarkdown("First. Next.", { locale: "not_a_locale" }),
		).toThrow(RangeError);
	});

	it("returns original UTF-16 offsets for editor integrations", () => {
		const input = "😀 First. Second.\n\nThird\nsentence.";
		const edits = getMarkdownEdits(input);
		expect(edits).toEqual([
			{ start: 9, end: 10, newText: "\n" },
			{ start: 24, end: 25, newText: " " },
		]);
		let result = input;
		for (const edit of edits.toReversed()) {
			result =
				result.slice(0, edit.start) + edit.newText + result.slice(edit.end);
		}
		expect(result).toBe(formatMarkdown(input));
	});
});

describe("remark writer", () => {
	it("replaces remark's default writer without normalizing Markdown", async () => {
		const input =
			"- **First.** _Next._\n\n[ref]: <https://example.com> 'Title'";
		const result = await remark().use(remarkSentencePerLine).process(input);
		expect(result.toString()).toBe(
			"- **First.**\n  _Next._\n\n[ref]: <https://example.com> 'Title'",
		);
	});

	it("works synchronously with a parser-only unified pipeline", () => {
		const result = unified()
			.use(remarkParse)
			.use(remarkSentencePerLine, { locale: "en" })
			.processSync("First. Next.");
		expect(result.toString()).toBe("First.\nNext.");
	});

	it("does not silently discard AST transformations", async () => {
		const changeHeading = () => (tree: Root) => {
			const node = tree.children[0];
			if (node?.type === "heading") {
				node.depth = 2;
			}
		};
		await expect(
			remark()
				.use(changeHeading)
				.use(remarkSentencePerLine)
				.process("# Heading\n\nFirst. Next."),
		).rejects.toThrow("cannot write a changed AST");
	});

	it("rejects a later stringifier", async () => {
		await expect(
			unified()
				.use(remarkParse)
				.use(remarkSentencePerLine)
				.use(remarkStringify)
				.process("First. Next."),
		).rejects.toThrow("must be the final writer");
	});
});

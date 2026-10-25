import { readFile } from "node:fs/promises";
import Parser from "tree-sitter";
import ccl from "tree-sitter-ccl";
import { describe, expect, it } from "vitest";

function parser(): Parser {
	const result = new Parser();
	result.setLanguage(ccl);
	return result;
}

function entries(tree: Parser.Tree): Parser.SyntaxNode[] {
	return tree.rootNode.namedChildren.filter((node) => node.type === "entry");
}

function keys(tree: Parser.Tree): string[] {
	return entries(tree).map(
		(entry) =>
			entry.namedChildren.find((node) => node.type === "key")?.text.trim() ??
			"",
	);
}

const injectionQuery = new Parser.Query(
	ccl,
	await readFile(new URL("../queries/injections.scm", import.meta.url), "utf8"),
);

function inject(source: string, tree: Parser.Tree): Parser.Tree[] {
	return injectionQuery.captures(tree.rootNode).map(({ node }) =>
		parser().parse(source, null, {
			includedRanges: [
				{
					startIndex: node.startIndex,
					endIndex: node.endIndex,
					startPosition: node.startPosition,
					endPosition: node.endPosition,
				},
			],
		}),
	);
}

describe("CCL values", () => {
	it.each([
		"",
		" ",
		"\t",
		" first line",
	])("keeps continuation lines after an inline value %j", (inline) => {
		const source = `parent =${inline}\n  first = 1\n  second = 2\nend = ok\n`;
		const tree = parser().parse(source);
		expect(tree.rootNode.hasError).toBe(false);
		expect(keys(tree)).toEqual(["parent", "end"]);
		expect(
			tree.rootNode
				.descendantsOfType("content_line")
				.map((node) => node.text.trim()),
		).toEqual(["first = 1", "second = 2"]);
	});

	it.each([
		"  name = item\n  value = 1",
		"  first line\n  second line",
	])("allows empty-key block values: %s", (value) => {
		const tree = parser().parse(`=\n${value}\n= next\n`);
		expect(tree.rootNode.hasError).toBe(false);
		expect(keys(tree)).toEqual(["", ""]);
		expect(
			tree.rootNode.descendantsOfType("nested_content_block"),
		).toHaveLength(1);
	});

	it.each([
		"\n",
		"\r\n",
	])("uses the parent baseline across indentation decreases and blanks (%j)", (newline) => {
		const source = [
			"parent =",
			"",
			"    first = 1",
			"",
			"  second = 2",
			"",
			"end = ok",
			"",
		].join(newline);
		const tree = parser().parse(source);
		expect(tree.rootNode.hasError).toBe(false);
		expect(keys(tree)).toEqual(["parent", "end"]);
		expect(
			tree.rootNode
				.descendantsOfType("content_line")
				.map((node) => node.text.trim()),
		).toEqual(["first = 1", "second = 2"]);
	});
});

describe("CCL injections", () => {
	it.each([
		"  ",
		"\t",
	])("keeps empty siblings separate at baseline %j", (indent) => {
		const source = `outer =\n${indent}empty =\n${indent}next = value\n`;
		const tree = parser().parse(source);
		const injected = inject(source, tree);
		expect(tree.rootNode.hasError).toBe(false);
		expect(injected).toHaveLength(1);
		expect(injected.map(keys)).toEqual([["empty", "next"]]);
		expect(injected.map((result) => result.rootNode.hasError)).toEqual([false]);
	});

	it.each([
		"  /= note\n  host = localhost",
		"  host = localhost\n  /= note\n  port = 80",
	])("keeps nested comments inside their parent: %s", (content) => {
		const source = `config =\n${content}\nend = ok\n`;
		const tree = parser().parse(source);
		expect(tree.rootNode.hasError).toBe(false);
		expect(keys(tree)).toEqual(["config", "end"]);
		expect(tree.rootNode.descendantsOfType("comment")).toHaveLength(0);
		const injected = inject(source, tree);
		expect(injected).toHaveLength(1);
		for (const result of injected) {
			expect(result.rootNode.hasError).toBe(false);
			expect(result.rootNode.descendantsOfType("comment")).toHaveLength(1);
			expect(
				result.rootNode.descendantsOfType("multiline_comment_content"),
			).toHaveLength(0);
			expect(keys(result)).toEqual(
				content.startsWith("  /=") ? ["host"] : ["host", "port"],
			);
		}
	});

	it("keeps sibling baselines through repeated injections", () => {
		const source =
			"outer =\n  group =\n    empty =\n    next = value\n  after = ok\n";
		const outer = inject(source, parser().parse(source));
		expect(outer.map(keys)).toEqual([["group", "after"]]);
		expect(outer.flatMap((tree) => inject(source, tree)).map(keys)).toEqual([
			["empty", "next"],
		]);
	});
});

describe("CCL keys and comments", () => {
	it("accepts slash-prefixed keys without treating them as comments", () => {
		const tree = parser().parse(
			"/path = value\n/other/path = other\n/= note\n",
		);
		expect(tree.rootNode.hasError).toBe(false);
		expect(keys(tree)).toEqual(["/path", "/other/path"]);
		expect(tree.rootNode.descendantsOfType("comment")).toHaveLength(1);
	});

	it("accepts keys spanning more than two lines", () => {
		const tree = parser().parse("long\nkey\nname = value\nend = ok\n");
		expect(tree.rootNode.hasError).toBe(false);
		expect(keys(tree)).toEqual(["long\nkey\nname", "end"]);
	});

	it.each([
		"",
		"\n",
		"\r\n",
	])("keeps the last multiline comment line without requiring a newline (%j)", (ending) => {
		const tree = parser().parse(`/= note\n  first line\n  last line${ending}`);
		expect(tree.rootNode.hasError).toBe(false);
		expect(tree.rootNode.descendantsOfType("comment")).toHaveLength(1);
		expect(
			tree.rootNode
				.descendantsOfType("comment_text")
				.map((node) => node.text.trim()),
		).toEqual(["note", "first line", "last line"]);
	});

	it("loads highlighting queries for the generated node types", async () => {
		const source = await readFile(
			new URL("../queries/highlights.scm", import.meta.url),
			"utf8",
		);
		const query = new Parser.Query(ccl, source);
		const tree = parser().parse("/path = value\n/= note\n");
		expect(query.captures(tree.rootNode).map(({ name }) => name)).toEqual([
			"variable.other.member",
			"operator",
			"string",
			"comment.marker",
			"comment.text",
		]);
	});
});

describe("incremental parsing", () => {
	it.each([
		["", "  "],
		["  ", ""],
	])("restores the document baseline when changing %j to %j", (before, after) => {
		const source = `${before}parent =\n  first = 1\n  second = 2\nend = ok\n`;
		const updated = after + source.slice(before.length);
		const instance = parser();
		const tree = instance.parse(source);
		tree.edit({
			startIndex: 0,
			oldEndIndex: before.length,
			newEndIndex: after.length,
			startPosition: { row: 0, column: 0 },
			oldEndPosition: { row: 0, column: before.length },
			newEndPosition: { row: 0, column: after.length },
		});
		const incremental = instance.parse(updated, tree);
		const fresh = parser().parse(updated);
		expect(incremental.rootNode.hasError).toBe(false);
		expect(incremental.rootNode.toString()).toBe(fresh.rootNode.toString());
		expect(keys(incremental)).toEqual(keys(fresh));
	});
});

import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import { describe, expect, it } from "vitest";
import {
	generateLittlefootCSS,
	generateLittlefootScript,
	rehypeFootnotes,
} from "../src/index.js";

describe("rehypeFootnotes", () => {
	it("should work as a rehype plugin and transform footnotes", async () => {
		const markdown = `Here is a footnote reference[^1].\n\n[^1]: This is the footnote.`;

		const result = await remark()
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeFootnotes)
			.use(rehypeStringify)
			.process(markdown);

		const html = String(result);

		// Check that the output contains Littlefoot-compatible attributes
		expect(html).toContain('rel="footnote"');
		expect(html).toContain('data-footnote-id');
		expect(html).toContain('id="fn:');
	});

	it("should remove back-reference links", async () => {
		const markdown = `Here is a footnote reference[^1].\n\n[^1]: This is the footnote.`;

		const result = await remark()
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeFootnotes)
			.use(rehypeStringify)
			.process(markdown);

		const html = String(result);

		// Back-reference links should be removed
		expect(html).not.toContain('data-footnote-backref');
		// But footnote data should remain
		expect(html).toContain('data-footnote-id');
	});

	it("should handle multiple footnotes", async () => {
		const markdown = `First[^1] and second[^2].\n\n[^1]: First note.\n[^2]: Second note.`;

		const result = await remark()
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeFootnotes)
			.use(rehypeStringify)
			.process(markdown);

		const html = String(result);

		// Should have both footnote references
		expect(html).toContain('data-footnote-id="1"');
		expect(html).toContain('data-footnote-id="2"');
		// Should have both footnote definitions
		expect(html).toContain('id="fn:1"');
		expect(html).toContain('id="fn:2"');
	});

	it("should accept custom options", async () => {
		const markdown = `Here is a footnote reference[^1].\n\n[^1]: This is the footnote.`;

		const result = await remark()
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeFootnotes, {
				activateOnLoad: false,
				littlefootOptions: {
					allowMultiple: true,
				},
			})
			.use(rehypeStringify)
			.process(markdown);

		const html = String(result);

		// Check that transformation still works with custom options
		expect(html).toContain('rel="footnote"');
		expect(html).toContain('data-footnote-id');
	});

	it("should handle footnotes with complex content", async () => {
		const markdown = `Reference[^note].\n\n[^note]: This has **bold** and _italic_ text.`;

		const result = await remark()
			.use(remarkGfm)
			.use(remarkRehype)
			.use(rehypeFootnotes)
			.use(rehypeStringify)
			.process(markdown);

		const html = String(result);

		// Should preserve the footnote content formatting
		expect(html).toContain('<strong>bold</strong>');
		expect(html).toContain('<em>italic</em>');
		// And add Littlefoot attributes
		expect(html).toContain('data-footnote-id="note"');
	});
});

describe("generateLittlefootScript", () => {
	it("should generate valid JavaScript initialization code", () => {
		const script = generateLittlefootScript();

		expect(script).toContain("import { littlefoot } from 'littlefoot'");
		expect(script).toContain("function initializeLittlefoot()");
		expect(script).toContain("littlefoot(");
		expect(script).toContain("document.addEventListener('DOMContentLoaded'");
	});

	it("should include custom options in generated script", () => {
		const script = generateLittlefootScript({
			littlefootOptions: {
				allowMultiple: true,
				hoverDelay: 500,
			},
		});

		expect(script).toContain('"allowMultiple": true');
		expect(script).toContain('"hoverDelay": 500');
	});

	it("should include default options when custom options provided", () => {
		const script = generateLittlefootScript({
			littlefootOptions: {
				allowMultiple: true,
			},
		});

		// Should include the custom option
		expect(script).toContain('"allowMultiple": true');
		// Should also include other default options since they're not overridden
		expect(script).toContain('"dismissDelay"');
		expect(script).toContain('"scope"');
	});
});

describe("generateLittlefootCSS", () => {
	it("should generate CSS import and styles", () => {
		const css = generateLittlefootCSS();

		expect(css).toContain("import 'littlefoot/dist/littlefoot.css'");
		expect(css).toContain(".littlefoot-footnote__wrapper");
		expect(css).toContain('a[rel="footnote"]');
	});

	it("should include custom styling", () => {
		const css = generateLittlefootCSS();

		expect(css).toContain("max-width: 400px");
		expect(css).toContain("font-size: 0.9em");
		expect(css).toContain("color: #0066cc");
	});
});

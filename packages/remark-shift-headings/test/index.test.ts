import { remark } from "remark";
import { describe, expect, it } from "vitest";
import { remarkShiftHeadings } from "../src/index.js";

describe("remarkShiftHeadings", () => {
	it("should normalize headings to h2 by default for collection content", async () => {
		const markdown = `# Heading 1\n## Heading 2\n### Heading 3`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/content/articles/test.md",
			});

		expect(String(result)).toBe(
			`## Heading 1\n\n### Heading 2\n\n#### Heading 3\n`,
		);
	});

	it("should normalize headings to h1 by default for non-collection content", async () => {
		const markdown = `## Heading 2\n### Heading 3\n#### Heading 4`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/pages/test.md",
			});

		expect(String(result)).toBe(
			`## Heading 2\n\n### Heading 3\n\n#### Heading 4\n`,
		);
	});

	it("should respect frontmatter headingStartLevel override", async () => {
		const markdown = `# Heading 1\n## Heading 2`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/content/articles/test.md",
				data: {
					astro: {
						frontmatter: {
							headingStartLevel: 3,
						},
					},
				},
			});

		expect(String(result)).toBe(`### Heading 1\n\n#### Heading 2\n`);
	});

	it("should respect context headingStartLevel", async () => {
		const markdown = `# Heading 1\n## Heading 2`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/pages/test.md",
				data: {
					headingStartLevel: 4,
				},
			});

		expect(String(result)).toBe(`#### Heading 1\n\n##### Heading 2\n`);
	});

	it("should prioritize frontmatter over context level", async () => {
		const markdown = `# Heading 1`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/pages/test.md",
				data: {
					headingStartLevel: 4,
					astro: {
						frontmatter: {
							headingStartLevel: 2,
						},
					},
				},
			});

		expect(String(result)).toBe(`## Heading 1\n`);
	});

	it("should clamp headings to maxLevel", async () => {
		const markdown = `# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6`;

		const result = await remark()
			.use(remarkShiftHeadings, { maxLevel: 4 })
			.process({
				value: markdown,
				path: "/src/content/articles/test.md",
			});

		// Starting at h2, but h5 and h6 should be clamped to h4
		expect(String(result)).toBe(
			`## H1\n\n### H2\n\n#### H3\n\n#### H4\n\n#### H5\n\n#### H6\n`,
		);
	});

	it("should skip normalization if target level is h1 (no-op)", async () => {
		const markdown = `# Heading 1\n## Heading 2`;

		const result = await remark()
			.use(remarkShiftHeadings, { defaultPageLevel: 1 })
			.process({
				value: markdown,
				path: "/src/pages/test.md",
			});

		expect(String(result)).toBe(`# Heading 1\n\n## Heading 2\n`);
	});

	it("should handle content with no headings", async () => {
		const markdown = `Just some text\n\nAnd a paragraph`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/content/articles/test.md",
			});

		expect(String(result)).toBe(`Just some text\n\nAnd a paragraph\n`);
	});

	it("should handle projects collection", async () => {
		const markdown = `# Project Title\n## Details`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/content/projects/my-project.md",
			});

		expect(String(result)).toBe(`## Project Title\n\n### Details\n`);
	});

	it("should use custom defaultCollectionLevel", async () => {
		const markdown = `# Heading 1\n## Heading 2`;

		const result = await remark()
			.use(remarkShiftHeadings, { defaultCollectionLevel: 3 })
			.process({
				value: markdown,
				path: "/src/content/articles/test.md",
			});

		expect(String(result)).toBe(`### Heading 1\n\n#### Heading 2\n`);
	});

	it("should use custom defaultPageLevel", async () => {
		const markdown = `# Heading 1\n## Heading 2`;

		const result = await remark()
			.use(remarkShiftHeadings, { defaultPageLevel: 2 })
			.process({
				value: markdown,
				path: "/src/pages/test.md",
			});

		expect(String(result)).toBe(`## Heading 1\n\n### Heading 2\n`);
	});

	it("should handle mixed heading levels", async () => {
		const markdown = `### H3\n# H1\n## H2\n##### H5`;

		const result = await remark()
			.use(remarkShiftHeadings)
			.process({
				value: markdown,
				path: "/src/content/articles/test.md",
			});

		// Min level is H1, should shift to H2
		expect(String(result)).toBe(`#### H3\n\n## H1\n\n### H2\n\n###### H5\n`);
	});
});

import { remark } from "remark";
import { describe, expect, it } from "vitest";
import { remarkLazyLinks } from "../src/index.js";

describe("remarkLazyLinks", () => {
	it("should transform single lazy link to numbered reference", async () => {
		const markdown = `[link text][*]\n\n[*]: http://example.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(`[link text][1]\n\n[1]: http://example.com\n`);
	});

	it("should transform multiple lazy links with sequential numbers", async () => {
		const markdown = `[first][*] and [second][*]\n\n[*]: http://first.com\n[*]: http://second.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[first][1] and [second][2]\n\n[1]: http://first.com\n[2]: http://second.com\n`,
		);
	});

	it("should preserve existing numbered links and continue numbering", async () => {
		const markdown = `[existing][1] and [lazy][*]\n\n[1]: http://existing.com\n[*]: http://lazy.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[existing][1] and [lazy][2]\n\n[1]: http://existing.com\n[2]: http://lazy.com\n`,
		);
	});

	it("should handle gaps in existing numbered links", async () => {
		const markdown = `[one][1] and [five][5] and [lazy][*]\n\n[1]: http://one.com\n[5]: http://five.com\n[*]: http://lazy.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		// Should continue from max existing number (5)
		expect(String(result)).toBe(
			`[one][1] and [five][5] and [lazy][6]\n\n[1]: http://one.com\n[5]: http://five.com\n[6]: http://lazy.com\n`,
		);
	});

	it("should do nothing when no lazy links present", async () => {
		const markdown = `[normal link][1]\n\n[1]: http://example.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[normal link][1]\n\n[1]: http://example.com\n`,
		);
	});

	it("should handle markdown with no links", async () => {
		const markdown = `Just plain text\n\nNo links here`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(`Just plain text\n\nNo links here\n`);
	});

	it("should handle lazy links with complex text", async () => {
		const markdown = `[**bold** and _italic_ text][*]\n\n[*]: http://example.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[**bold** and *italic* text][1]\n\n[1]: http://example.com\n`,
		);
	});

	it("should handle lazy links with URLs containing special characters", async () => {
		const markdown = `[link][*]\n\n[*]: http://example.com/path?query=value&other=123`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[link][1]\n\n[1]: http://example.com/path?query=value&other=123\n`,
		);
	});

	it("should handle multiline content between link and definition", async () => {
		const markdown = `[link][*]\n\nSome paragraph text\n\nAnother paragraph\n\n[*]: http://example.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[link][1]\n\nSome paragraph text\n\nAnother paragraph\n\n[1]: http://example.com\n`,
		);
	});

	it("should start numbering from 1 when no existing numbered links", async () => {
		const markdown = `[first][*] [second][*]\n\n[*]: http://first.com\n[*]: http://second.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[first][1] [second][2]\n\n[1]: http://first.com\n[2]: http://second.com\n`,
		);
	});

	it("should handle mixed lazy and numbered links", async () => {
		const markdown = `[numbered][2] and [lazy1][*] and [lazy2][*]\n\n[2]: http://numbered.com\n[*]: http://lazy1.com\n[*]: http://lazy2.com`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[numbered][2] and [lazy1][3] and [lazy2][4]\n\n[2]: http://numbered.com\n[3]: http://lazy1.com\n[4]: http://lazy2.com\n`,
		);
	});

	it("should handle lazy link definitions with optional titles", async () => {
		const markdown = `[link][*]\n\n[*]: http://example.com "Optional Title"`;

		const result = await remark().use(remarkLazyLinks).process(markdown);

		expect(String(result)).toBe(
			`[link][1]\n\n[1]: http://example.com "Optional Title"\n`,
		);
	});
});

describe("remarkLazyLinks with persist option", () => {
	it("should not throw when persist is false", async () => {
		const markdown = `[link][*]\n\n[*]: http://example.com`;

		await expect(
			remark().use(remarkLazyLinks, { persist: false }).process(markdown),
		).resolves.toBeDefined();
	});

	it("should transform content even with persist option", async () => {
		const markdown = `[link][*]\n\n[*]: http://example.com`;

		const result = await remark()
			.use(remarkLazyLinks, { persist: true })
			.process(markdown);

		expect(String(result)).toBe(`[link][1]\n\n[1]: http://example.com\n`);
	});
});

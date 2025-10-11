import { describe, expect, it } from "vitest";

import { getComicProps } from "../src/index.ts";

describe("getComicProps", () => {
	it("gets existing comic", async () => {
		const comic = await getComicProps(123);
		expect(comic).toMatchSnapshot();
	});

	it("throws error when comic is not found", async () => {
		await expect(async () => {
			const comic = await getComicProps(0);
			expect(comic).toMatchSnapshot();
		}).rejects.toThrowErrorMatchingSnapshot("Status code 404");
	});
});

import { describe, expect, it } from "vitest";

import { getComicProps } from "../src/index.js";

describe("getComicProps", () => {
	it("gets existing comic", async () => {
		const comic = await getComicProps(123);
		expect(comic).toMatchSnapshot();
	});

	it("throws error when comic is not found", () => {
		expect(async () => {
			const comic = await getComicProps(0);
			expect(comic).toMatchSnapshot();
		}).not.toThrowError();
	});
});

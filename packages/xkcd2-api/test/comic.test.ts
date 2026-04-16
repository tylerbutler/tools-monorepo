import { beforeEach, describe, expect, it, vi } from "vitest";

import { getComicProps, getRandomComicId } from "../src/index.js";

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

describe("getRandomComicId", () => {
	beforeEach(() => {
		// Reset Math.random mock before each test
		vi.restoreAllMocks();
	});

	it("returns a random comic ID within bounds", async () => {
		// Mock Math.random to return a predictable value
		vi.spyOn(Math, "random").mockReturnValue(0.5);

		const randomId = await getRandomComicId();

		// The ID should be a number
		expect(typeof randomId).toBe("number");
		// Should be greater than or equal to 0
		expect(randomId).toBeGreaterThanOrEqual(0);
		// Should be less than the latest comic number
		const { comic: latestComic } = await getComicProps();
		expect(randomId).toBeLessThan(latestComic.num);
	});

	it("returns 0 when Math.random returns 0", async () => {
		vi.spyOn(Math, "random").mockReturnValue(0);

		const randomId = await getRandomComicId();

		expect(randomId).toBe(0);
	});

	it("returns the maximum comic ID when Math.random returns ~1", async () => {
		// Use a value very close to 1
		vi.spyOn(Math, "random").mockReturnValue(0.9999);

		const randomId = await getRandomComicId();
		const { comic: latestComic } = await getComicProps();

		// Floor of (0.9999 * num) should be num - 1
		expect(randomId).toBeLessThan(latestComic.num);
		expect(randomId).toBeGreaterThanOrEqual(latestComic.num - 2);
	});

	it("returns different values for different random values", async () => {
		const randomSpy = vi.spyOn(Math, "random");

		// First call
		randomSpy.mockReturnValueOnce(0.1);
		const id1 = await getRandomComicId();

		// Second call - need to re-mock since it's a new call chain
		randomSpy.mockReturnValueOnce(0.9);
		const id2 = await getRandomComicId();

		// The IDs should be different
		expect(id1).not.toBe(id2);
		expect(id1).toBeLessThan(id2);
	});
});

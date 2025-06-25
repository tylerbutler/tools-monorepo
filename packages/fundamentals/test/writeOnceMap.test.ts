import { describe, expect, it } from "vitest";

import { KeyAlreadySet, WriteOnceMap } from "../src/writeOnceMap.js";

describe("writeOnceMap", () => {
	it("sets unused key with class", () => {
		const map = new WriteOnceMap<string, number>();
		map.set("key", 1);
		const actual = map.get("key");
		expect(actual).toBe(1);
	});

	it("throws on duplicate key", () => {
		const map = new WriteOnceMap<string, number>();
		map.set("key", 1);

		expect(() => map.set("key", 2)).toThrow(KeyAlreadySet);

		const actual = map.get("key");
		expect(actual).toBe(1);
	});

	it("resets duplicate key with force", () => {
		const map = new WriteOnceMap<string, number>();
		map.set("key", 1);

		expect(() => map.set("key", 2, true)).not.toThrow(KeyAlreadySet);

		const actual = map.get("key");
		expect(actual).toBe(2);
	});
});

import { describe, expect, it } from "vitest";
import { isSyncSupported } from "../../src/commands/deps/sync.js";

describe("isSyncSupported", () => {
	it("returns true for npm", () => {
		expect(isSyncSupported("npm")).toBe(true);
	});

	it("returns true for pnpm", () => {
		expect(isSyncSupported("pnpm")).toBe(true);
	});

	it("returns false for yarn", () => {
		expect(isSyncSupported("yarn")).toBe(false);
	});

	it("returns false for bun", () => {
		expect(isSyncSupported("bun")).toBe(false);
	});
});

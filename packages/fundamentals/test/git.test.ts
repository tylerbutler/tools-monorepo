import path from "node:path";
import { fileURLToPath } from "node:url";
import { temporaryDirectory } from "tempy";
import { describe, expect, it } from "vitest";

import { findGitRootSync } from "../src/git.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("git APIs", () => {
	describe("findGitRootSync", () => {
		it("returns correct path", () => {
			const expected = path.resolve(__dirname, "../../..");
			const actual = findGitRootSync();
			expect(actual).toEqual(expected);
		});

		it("throws when not in git repo", () => {
			expect(() => {
				findGitRootSync(temporaryDirectory());
			}).throws("Failed to find Git repository root");
		});
	});
});

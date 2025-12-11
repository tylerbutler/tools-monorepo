import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "pathe";
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
				findGitRootSync(mkdtempSync(path.join(tmpdir(), "git-test-")));
			}).throws("Failed to find Git repository root");
		});
	});
});

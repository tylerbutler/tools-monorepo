import * as path from "node:path";

import { describe, expect, it } from "vitest";

import { isPathUnder, lookUpDirSync } from "../utils.js";

describe("utils", () => {
	describe("lookUpDirSync", () => {
		it("should find directory when callback returns true", () => {
			const startDir = "/home/user/project/src/components";
			const targetDir = "/home/user/project";

			const result = lookUpDirSync(startDir, (dir) => dir === targetDir);

			expect(result).toBe(targetDir);
		});

		it("should return undefined when reaching root without match", () => {
			const startDir = "/home/user/project";

			const result = lookUpDirSync(startDir, () => false);

			expect(result).toBeUndefined();
		});

		it("should return first matching directory", () => {
			const startDir = "/home/user/project/src";
			let callCount = 0;

			const result = lookUpDirSync(startDir, (dir) => {
				callCount++;
				return dir.endsWith("/project");
			});

			expect(result).toBe("/home/user/project");
			expect(callCount).toBeGreaterThan(0);
		});

		it("should handle root directory", () => {
			const result = lookUpDirSync("/", (dir) => dir === "/");

			expect(result).toBe("/");
		});

		it("should resolve relative paths before searching", () => {
			const relativeDir = "./test";
			const resolvedDir = path.resolve(relativeDir);

			const result = lookUpDirSync(relativeDir, (dir) => dir === resolvedDir);

			expect(result).toBe(resolvedDir);
		});

		it("should traverse upwards correctly", () => {
			const startDir = "/a/b/c/d";
			const visitedDirs: string[] = [];

			lookUpDirSync(startDir, (dir) => {
				visitedDirs.push(dir);
				return false;
			});

			// Should visit: /a/b/c/d, /a/b/c, /a/b, /a, /
			expect(visitedDirs).toContain("/a/b/c/d");
			expect(visitedDirs).toContain("/a/b/c");
			expect(visitedDirs).toContain("/a/b");
			expect(visitedDirs).toContain("/a");
			expect(visitedDirs.at(-1)).toBe("/");
		});
	});

	describe("isPathUnder", () => {
		it("should return true when child is directly under parent", () => {
			const parent = "/home/user/project";
			const child = "/home/user/project/src";

			expect(isPathUnder(parent, child)).toBe(true);
		});

		it("should return true when child is nested under parent", () => {
			const parent = "/home/user/project";
			const child = "/home/user/project/src/components/Button.tsx";

			expect(isPathUnder(parent, child)).toBe(true);
		});

		it("should return false when paths are equal", () => {
			const samePath = "/home/user/project";

			expect(isPathUnder(samePath, samePath)).toBe(false);
		});

		it("should return false when child is not under parent", () => {
			const parent = "/home/user/project";
			const child = "/home/user/other-project/src";

			expect(isPathUnder(parent, child)).toBe(false);
		});

		it("should return false when child is sibling of parent", () => {
			const parent = "/home/user/project";
			const child = "/home/user/other";

			expect(isPathUnder(parent, child)).toBe(false);
		});

		it("should return false when child appears to start with parent name but isn't", () => {
			// Edge case: /home/user/project vs /home/user/project-backup
			const parent = "/home/user/project";
			const child = "/home/user/project-backup/src";

			expect(isPathUnder(parent, child)).toBe(false);
		});

		it("should handle relative paths by resolving them", () => {
			const parent = "./parent";
			const child = "./parent/child";
			const resolvedParent = path.resolve(parent);
			const resolvedChild = path.resolve(child);

			// Should work the same as with resolved paths
			expect(isPathUnder(parent, child)).toBe(
				isPathUnder(resolvedParent, resolvedChild),
			);
		});

		it("should handle paths with trailing slashes", () => {
			const parent = "/home/user/project/";
			const child = "/home/user/project/src";

			// Should still work correctly
			expect(isPathUnder(parent, child)).toBe(true);
		});

		it("should be case-sensitive on Unix-like systems", () => {
			const parent = "/home/user/Project";
			const child = "/home/user/project/src";

			// On Unix systems, these are different paths
			expect(isPathUnder(parent, child)).toBe(false);
		});

		it("should handle root directory correctly", () => {
			const parent = "/";
			const child = "/home/user/project";

			expect(isPathUnder(parent, child)).toBe(true);
		});

		it("should return false when child is parent's parent", () => {
			const parent = "/home/user/project";
			const child = "/home/user";

			expect(isPathUnder(parent, child)).toBe(false);
		});
	});
});

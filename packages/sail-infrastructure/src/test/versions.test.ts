import { strict as assert } from "node:assert/strict";
import * as path from "pathe";

import * as semver from "semver";
import { simpleGit } from "simple-git";
import { beforeEach, describe, expect, it } from "vitest";

import { loadBuildProject } from "../buildProject.js";
import type { ReleaseGroupName, WorkspaceName } from "../types.js";
import { setVersion } from "../versions.js";

import { testDataPath, testRepoRoot } from "./init.js";

const repo = loadBuildProject(path.join(testDataPath, "./testRepo"));
const main = repo.releaseGroups.get("main" as ReleaseGroupName);
assert(main !== undefined);

const group2 = repo.releaseGroups.get("group2" as ReleaseGroupName);
assert(group2 !== undefined);

const group3 = repo.releaseGroups.get("group3" as ReleaseGroupName);
assert(group3 !== undefined);

const secondWorkspace = repo.workspaces.get("second" as WorkspaceName);
assert(secondWorkspace !== undefined);

/**
 * A git client rooted in the test repo. Used for resetting tests.
 */
const git = simpleGit(testRepoRoot);

describe("setVersion", () => {
	// Use beforeEach instead of afterEach for cleanup to avoid git index.lock race conditions.
	// With afterEach, the cleanup from test N can still be running when test N+1's afterEach starts,
	// causing concurrent git operations that conflict on .git/index.lock.
	beforeEach(async () => {
		await git.checkout(["HEAD", "--", testRepoRoot]);
		repo.reload();
	});

	it("release group", async () => {
		const version = semver.parse("1.2.1");
		if (!version) {
			throw new Error("Failed to parse version");
		}
		await setVersion(main.packages, version);

		const allCorrect = main.packages.every((pkg) => pkg.version === "1.2.1");
		expect(main.version).toBe("1.2.1");
		expect(allCorrect).toBe(true);
	});

	it("workspace", async () => {
		const version = semver.parse("2.2.1");
		if (!version) {
			throw new Error("Failed to parse version");
		}
		await setVersion(secondWorkspace.packages, version);

		const allCorrect = secondWorkspace.packages.every(
			(pkg) => pkg.version === "2.2.1",
		);
		expect(allCorrect).toBe(true);
	});

	it("repo", async () => {
		const packages = [...repo.packages.values()];
		const version = semver.parse("1.2.1");
		if (!version) {
			throw new Error("Failed to parse version");
		}
		await setVersion(packages, version);

		const allCorrect = packages.every((pkg) => pkg.version === "1.2.1");
		expect(allCorrect).toBe(true);
	});
});

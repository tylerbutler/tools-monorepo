import { strict as assert } from "node:assert/strict";

import { describe, expect, it } from "vitest";

import { loadBuildProject } from "../buildProject.js";
import { findGitRootSync } from "../git.js";
import type { ReleaseGroupName, WorkspaceName } from "../types.js";

import { testRepoRoot } from "./init.js";

describe("loadBuildProject", () => {
	describe("testRepo", () => {
		it("loads correctly", () => {
			const repo = loadBuildProject(testRepoRoot);
			assert.strictEqual(
				repo.workspaces.size,
				2,
				`Expected 2 workspaces, found ${repo.workspaces.size}`,
			);

			const main = repo.workspaces.get("main" as WorkspaceName);
			expect(main).toBeDefined();
			expect(main?.packages.length).toBe(9);

			expect(main?.releaseGroups.size).toBe(3);

			const mainReleaseGroup = repo.releaseGroups.get(
				"main" as ReleaseGroupName,
			);
			expect(mainReleaseGroup).toBeDefined();
			expect(mainReleaseGroup?.packages.length).toBe(5);

			const second = repo.workspaces.get("second" as WorkspaceName);
			expect(second).toBeDefined();
			expect(second?.packages.length).toBe(3);

			expect(second?.releaseGroups.size).toBe(1);
		});

		it("releaseGroupDependencies", async () => {
			const repo = loadBuildProject(testRepoRoot);
			const mainReleaseGroup = repo.releaseGroups.get(
				"main" as ReleaseGroupName,
			);
			// Test data (validated by another test) guarantees this has a value
			if (!mainReleaseGroup) {
				throw new Error("mainReleaseGroup is undefined");
			}
			const actualDependencies = mainReleaseGroup.releaseGroupDependencies;
			const names = actualDependencies.map((r) => r.name as string);

			expect(actualDependencies).toBeDefined();
			expect(names).toEqual(expect.arrayContaining(["group2"]));
		});
	});

	// biome-ignore lint/suspicious/noSkippedTests: Tests require running in FluidFramework repository, not tools-monorepo
	describe.skip("FluidFramework repo - tests backCompat config loading", () => {
		// These tests require running in the FluidFramework repository
		// Skip them in other environments (like tools-monorepo)
		it("loads correctly", () => {
			// Load the root config
			const repo = loadBuildProject(findGitRootSync());
			expect(repo.workspaces.size).toBeGreaterThan(1);

			const client = repo.workspaces.get("client" as WorkspaceName);
			expect(client).toBeDefined();
			expect(client?.packages.length).toBeGreaterThan(1);
			expect(client?.releaseGroups.size).toBeGreaterThan(0);

			const buildTools = repo.workspaces.get("build-tools" as WorkspaceName);
			expect(buildTools).toBeDefined();
			expect(buildTools?.packages.length).toBe(6);

			expect(buildTools?.releaseGroups.size).toBe(1);
		});

		it("releaseGroupDependencies", async () => {
			const repo = loadBuildProject(findGitRootSync());
			const clientReleaseGroup = repo.releaseGroups.get(
				"client" as ReleaseGroupName,
			);
			assert(clientReleaseGroup !== undefined);

			expect(() => clientReleaseGroup.releaseGroupDependencies).not.toThrow(
				/Key.*? is already set and cannot be modified/,
			);

			try {
				const actualDependencies = clientReleaseGroup.releaseGroupDependencies;

				expect(actualDependencies).toBeDefined();
				expect(actualDependencies.length).toBeGreaterThan(0);
			} catch (error) {
				expect(error).toMatch(/111/);
			}
		});
	});
});

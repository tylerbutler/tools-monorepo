import * as path from "pathe";

import { describe, expect, it } from "vitest";

import { loadBuildProject } from "../buildProject.js";
import type { WorkspaceName } from "../types.js";
import { loadWorkspacesFromLegacyConfig } from "../workspaceCompat.js";
import type { WorkspaceCompatDeps } from "../workspaceCompatDeps.js";

import { testRepoRoot } from "./init.js";

/**
 * Tests for workspaceCompat module.
 *
 * Note: These are integration tests that use real filesystem structures because
 * the downstream Workspace.load() function requires actual workspace files
 * (pnpm-workspace.yaml, package.json, etc.) to resolve workspace roots.
 *
 * The dependency injection in workspaceCompat makes the module itself testable,
 * but full end-to-end tests still need real workspace structures.
 */
describe("workspaceCompat", () => {
	describe("dependency injection", () => {
		it("should use injected fileExists dependency", () => {
			const testDir = "packages/main";
			const mockRoot = "/mock-repo";
			const fullPath = path.join(mockRoot, testDir);

			let fileExistsCalled = false;
			const mockDeps: WorkspaceCompatDeps = {
				fileExists: (filePath) => {
					fileExistsCalled = true;
					return filePath === path.join(fullPath, "package.json");
				},
				findFiles: () => [],
			};

			const mockBuildProject = {
				root: mockRoot,
				// biome-ignore lint/suspicious/noExplicitAny: Partial mock for testing
			} as any;

			const config = {
				main: testDir,
			};

			// This will throw because Workspace.load needs real files,
			// but we're verifying that our mock fileExists was called
			try {
				loadWorkspacesFromLegacyConfig(config, mockBuildProject, mockDeps);
			} catch {
				// Expected to fail - we're just testing that the dependency was used
			}

			expect(fileExistsCalled).toBe(true);
		});

		it("should use injected findFiles dependency", () => {
			const testDir = "packages";
			const mockRoot = "/mock-repo";
			const fullPath = path.join(mockRoot, testDir);

			let findFilesCalled = false;
			const mockDeps: WorkspaceCompatDeps = {
				fileExists: () => false, // No package.json in root directory
				findFiles: (patterns, _options) => {
					findFilesCalled = true;
					expect(patterns).toContain("**/package.json");
					return [
						path.join(fullPath, "pkg-a", "package.json"),
						path.join(fullPath, "pkg-b", "package.json"),
					];
				},
			};

			const mockBuildProject = {
				root: mockRoot,
				// biome-ignore lint/suspicious/noExplicitAny: Partial mock for testing
			} as any;

			const config = {
				packages: testDir,
			};

			// This will throw because Workspace.load needs real files,
			// but we're verifying that our mock findFiles was called
			try {
				loadWorkspacesFromLegacyConfig(config, mockBuildProject, mockDeps);
			} catch {
				// Expected to fail - we're just testing that the dependency was used
			}

			expect(findFilesCalled).toBe(true);
		});
	});

	describe("integration tests with real workspace", () => {
		it("should load workspaces from testRepo using default dependencies", () => {
			// Load using the default dependencies (real fs and glob)
			const buildProject = loadBuildProject(testRepoRoot);

			// The testRepo has two workspaces: main and second
			expect(buildProject.workspaces.size).toBe(2);
			expect(buildProject.workspaces.has("main" as WorkspaceName)).toBe(true);
			expect(buildProject.workspaces.has("second" as WorkspaceName)).toBe(true);
		});

		it("should create release groups for legacy config workspaces", () => {
			const buildProject = loadBuildProject(testRepoRoot);

			const mainWorkspace = buildProject.workspaces.get(
				"main" as WorkspaceName,
			);
			expect(mainWorkspace).toBeDefined();
			expect(mainWorkspace?.releaseGroups.size).toBeGreaterThan(0);
		});
	});
});

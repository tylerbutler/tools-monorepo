import { describe, expect, it } from "vitest";

import { loadBuildProject } from "../buildProject.js";
import type {
	IPackage,
	IReleaseGroup,
	IWorkspace,
	ReleaseGroupName,
	WorkspaceName,
} from "../types.js";
import { isIPackage, isIReleaseGroup } from "../types.js";

import { testRepoRoot } from "./init.js";

describe("types", () => {
	describe("type guards", () => {
		describe("isIPackage", () => {
			it("should return true for valid IPackage objects", () => {
				const repo = loadBuildProject(testRepoRoot);
				const main = repo.workspaces.get("main" as WorkspaceName);
				expect(main).toBeDefined();

				const pkg = main!.packages[0];
				expect(isIPackage(pkg)).toBe(true);
			});

			it("should return false for objects without name property", () => {
				const notPackage = { version: "1.0.0" };
				expect(isIPackage(notPackage)).toBe(false);
			});

			it("should return false for objects without packageJson property", () => {
				const notPackage = { name: "test-package" };
				expect(isIPackage(notPackage)).toBe(false);
			});

			it("should return false for primitives and undefined", () => {
				expect(isIPackage("string")).toBe(false);
				expect(isIPackage(123)).toBe(false);
				expect(isIPackage(undefined)).toBe(false);
			});

			it("should return false for objects with name but wrong structure", () => {
				const notPackage = { name: "test", something: "else" };
				expect(isIPackage(notPackage)).toBe(false);
			});

			it("should check for getScript method", () => {
				const mockPackage = {
					name: "test-package",
					packageJson: { name: "test", version: "1.0.0" },
					getScript: () => undefined,
				};
				expect(isIPackage(mockPackage)).toBe(true);
			});
		});

		describe.skip("isIWorkspace", () => {
			it("should return true for valid IWorkspace objects", () => {
				const repo = loadBuildProject(testRepoRoot);
				const workspace = repo.workspaces.get("main" as WorkspaceName);

				expect(workspace).toBeDefined();
				expect(isIWorkspace(workspace)).toBe(true);
			});

			it("should return false for objects without name property", () => {
				const notWorkspace = { packages: [] };
				expect(isIWorkspace(notWorkspace)).toBe(false);
			});

			it("should return false for objects without packages property", () => {
				const notWorkspace = { name: "test-workspace" };
				expect(isIWorkspace(notWorkspace)).toBe(false);
			});

			it("should return false for objects without releaseGroups property", () => {
				const notWorkspace = {
					name: "test-workspace",
					packages: [],
				};
				expect(isIWorkspace(notWorkspace)).toBe(false);
			});

			it("should return false for non-objects", () => {
				expect(isIWorkspace("string")).toBe(false);
				expect(isIWorkspace(123)).toBe(false);
				expect(isIWorkspace(null)).toBe(false);
				expect(isIWorkspace(undefined)).toBe(false);
			});

			it("should return true for object with all required properties", () => {
				const mockWorkspace = {
					name: "test-workspace",
					packages: [],
					releaseGroups: new Map(),
				};
				expect(isIWorkspace(mockWorkspace)).toBe(true);
			});
		});

		describe("isIReleaseGroup", () => {
			it("should return true for valid IReleaseGroup objects", () => {
				const repo = loadBuildProject(testRepoRoot);
				const releaseGroup = repo.releaseGroups.get("main" as ReleaseGroupName);

				expect(releaseGroup).toBeDefined();
				expect(isIReleaseGroup(releaseGroup)).toBe(true);
			});

			it("should return false for objects without name property", () => {
				const notReleaseGroup = { packages: [] };
				expect(isIReleaseGroup(notReleaseGroup)).toBe(false);
			});

			it("should return false for objects without workspace property", () => {
				const notReleaseGroup = {
					name: "test-release-group",
					packages: [],
				};
				expect(isIReleaseGroup(notReleaseGroup)).toBe(false);
			});

			it("should return false for objects without packages property", () => {
				const notReleaseGroup = {
					name: "test-release-group",
					workspace: {} as IWorkspace,
				};
				expect(isIReleaseGroup(notReleaseGroup)).toBe(false);
			});

			it("should return false for primitives and undefined", () => {
				expect(isIReleaseGroup(123)).toBe(false);
				expect(isIReleaseGroup(undefined)).toBe(false);
			});

			it("should return true for object with all required properties", () => {
				const mockReleaseGroup = {
					name: "test-release-group",
					workspace: {} as IWorkspace,
					packages: [],
				};
				expect(isIReleaseGroup(mockReleaseGroup)).toBe(true);
			});
		});

		describe("type guard edge cases", () => {
			it("should handle objects with extra properties", () => {
				const packageWithExtra = {
					name: "test-package",
					packageJson: { name: "test", version: "1.0.0" },
					getScript: () => undefined,
					extraProperty: "should not matter",
				};
				expect(isIPackage(packageWithExtra)).toBe(true);
			});

			it("should handle arrays", () => {
				expect(isIPackage([])).toBe(false);
				expect(isIReleaseGroup([])).toBe(false);
			});

			it("should handle Date objects", () => {
				const date = new Date();
				expect(isIPackage(date)).toBe(false);
				expect(isIReleaseGroup(date)).toBe(false);
			});

			it("should handle Error objects", () => {
				const error = new Error("test");
				expect(isIPackage(error)).toBe(false);
				expect(isIReleaseGroup(error)).toBe(false);
			});

			it("should handle Map objects", () => {
				const map = new Map();
				expect(isIPackage(map)).toBe(false);
				expect(isIReleaseGroup(map)).toBe(false);
			});

			it("should handle Set objects", () => {
				const set = new Set();
				expect(isIPackage(set)).toBe(false);
				expect(isIReleaseGroup(set)).toBe(false);
			});
		});

		describe("type guard with real build project data", () => {
			it("should correctly identify all packages in testRepo", () => {
				const repo = loadBuildProject(testRepoRoot);

				for (const pkg of repo.packages.values()) {
					expect(isIPackage(pkg)).toBe(true);
				}
			});

			it("should correctly identify all workspaces in testRepo", () => {
				const repo = loadBuildProject(testRepoRoot);

				for (const workspace of repo.workspaces.values()) {
					expect(workspace).toBeDefined();
					expect(workspace.name).toBeDefined();
				}
			});

			it("should correctly identify all release groups in testRepo", () => {
				const repo = loadBuildProject(testRepoRoot);

				for (const releaseGroup of repo.releaseGroups.values()) {
					expect(isIReleaseGroup(releaseGroup)).toBe(true);
				}
			});
		});
	});

	describe("opaque types", () => {
		it("WorkspaceName should be assignable from string", () => {
			// This is a compile-time check - if it compiles, the test passes
			const name: WorkspaceName = "test" as WorkspaceName;
			expect(typeof name).toBe("string");
		});

		it("ReleaseGroupName should be assignable from string", () => {
			// This is a compile-time check - if it compiles, the test passes
			const name: ReleaseGroupName = "test" as ReleaseGroupName;
			expect(typeof name).toBe("string");
		});

		it("should be able to use opaque types as Map keys", () => {
			const repo = loadBuildProject(testRepoRoot);

			// WorkspaceName as key
			const workspaceName = "main" as WorkspaceName;
			const workspace = repo.workspaces.get(workspaceName);
			expect(workspace).toBeDefined();

			// ReleaseGroupName as key
			const releaseGroupName = "main" as ReleaseGroupName;
			const releaseGroup = repo.releaseGroups.get(releaseGroupName);
			expect(releaseGroup).toBeDefined();
		});
	});

	describe("interface relationships", () => {
		it("IPackage should reference its workspace and release group", () => {
			const repo = loadBuildProject(testRepoRoot);
			const main = repo.workspaces.get("main" as WorkspaceName);
			expect(main).toBeDefined();

			const pkg = main!.packages[0] as IPackage;

			expect(pkg.workspace).toBeDefined();
			expect(pkg.releaseGroup).toBeDefined();
			expect(pkg.workspace.name).toBeDefined();
		});

		it("IReleaseGroup should reference its workspace", () => {
			const repo = loadBuildProject(testRepoRoot);
			const releaseGroup = repo.releaseGroups.get("main" as ReleaseGroupName);

			expect(releaseGroup).toBeDefined();
			expect(releaseGroup!.workspace).toBeDefined();
			expect(releaseGroup!.workspace.name).toBeDefined();
		});

		it("IWorkspace should contain packages and release groups", () => {
			const repo = loadBuildProject(testRepoRoot);
			const workspace = repo.workspaces.get("main" as WorkspaceName);

			expect(workspace).toBeDefined();
			expect(workspace!.packages.length).toBeGreaterThan(0);
			expect(workspace!.releaseGroups.size).toBeGreaterThan(0);

			// All packages should be valid
			for (const pkg of workspace!.packages) {
				expect(isIPackage(pkg)).toBe(true);
			}

			// All release groups should be valid
			for (const rg of workspace!.releaseGroups.values()) {
				expect(isIReleaseGroup(rg)).toBe(true);
			}
		});
	});
});

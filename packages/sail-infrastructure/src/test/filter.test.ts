import { strict as assert } from "node:assert/strict";

import { describe, expect, it } from "vitest";

import { loadBuildProject } from "../buildProject.js";
import {
	AllPackagesSelectionCriteria,
	EmptySelectionCriteria,
	filterPackages,
	type PackageFilterOptions,
	type PackageSelectionCriteria,
	selectAndFilterPackages,
} from "../filter.js";
import type { IBuildProject, IPackage, WorkspaceName } from "../types.js";

import { testRepoRoot } from "./init.js";

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

const EmptyFilter: PackageFilterOptions = {
	private: undefined,
	scope: undefined,
	skipScope: undefined,
};

async function getBuildProject(): Promise<IBuildProject> {
	const buildProject = loadBuildProject(testRepoRoot, false, "myorg/test-repo");
	return buildProject;
}

async function getMainWorkspacePackages(): Promise<IPackage[]> {
	const buildProject = await getBuildProject();
	const packages = buildProject.workspaces.get(
		"main" as WorkspaceName,
	)?.packages;
	assert(packages !== undefined);
	return packages;
}

describe("filterPackages", () => {
	it("no filters", async () => {
		const packages = await getMainWorkspacePackages();
		const filters = EmptyFilter;

		const actual = await filterPackages(packages, filters);
		const names = actual.map((p) => p.name);
		expect(names).toEqual([
			"main-release-group-root",
			"@group2/pkg-d",
			"@group2/pkg-e",
			"@group3/pkg-f",
			"@group3/pkg-g",
			"pkg-a",
			"pkg-b",
			"@private/pkg-c",
			"@shared/shared",
		]);
	});

	it("private=true", async () => {
		const packages = await getMainWorkspacePackages();
		const filters = { ...EmptyFilter, private: true };
		const actual = await filterPackages(packages, filters);
		const names = actual.map((p) => p.name);
		expect(names).toEqual(expect.arrayContaining(["@private/pkg-c"]));
		expect(names).toHaveLength(1);
	});

	it("private=false", async () => {
		const packages = await getMainWorkspacePackages();
		const filters = { ...EmptyFilter, private: false };
		const actual = await filterPackages(packages, filters);
		const names = actual.map((p) => p.name);
		expect(names).toEqual([
			"main-release-group-root",
			"@group2/pkg-d",
			"@group2/pkg-e",
			"@group3/pkg-f",
			"@group3/pkg-g",
			"pkg-a",
			"pkg-b",
			"@shared/shared",
		]);
	});

	it("multiple scopes", async () => {
		const packages = await getMainWorkspacePackages();
		const filters: PackageFilterOptions = {
			private: undefined,
			scope: ["@shared", "@private"],
			skipScope: undefined,
		};
		const actual = await filterPackages(packages, filters);
		const names = actual.map((p) => p.name);
		expect(names).toEqual(
			expect.arrayContaining(["@shared/shared", "@private/pkg-c"]),
		);
	});

	it("multiple skipScopes", async () => {
		const packages = await getMainWorkspacePackages();
		const filters: PackageFilterOptions = {
			...EmptyFilter,
			skipScope: ["@shared", "@private", "@group3"],
		};
		const actual = await filterPackages(packages, filters);
		const names = actual.map((p) => p.name);
		expect(names).toEqual([
			"main-release-group-root",
			"@group2/pkg-d",
			"@group2/pkg-e",
			"pkg-a",
			"pkg-b",
		]);
	});

	it("scope and skipScope", async () => {
		const packages = await getMainWorkspacePackages();
		const filters: PackageFilterOptions = {
			...EmptyFilter,
			scope: ["@shared", "@private"],
			skipScope: ["@shared"],
		};
		const actual = await filterPackages(packages, filters);
		const names = actual.map((p) => p.name);
		expect(names).toEqual(["@private/pkg-c"]);
	});
});

describe("selectAndFilterPackages", () => {
	const buildProjectPromise = getBuildProject();

	it("all, no filters", async () => {
		const buildProject = await buildProjectPromise;
		const selectionOptions = AllPackagesSelectionCriteria;
		const filter = EmptyFilter;

		const { selected } = await selectAndFilterPackages(
			buildProject,
			selectionOptions,
			filter,
		);
		const names = selected.map((p) => p.name).sort();

		expect(names).toEqual([
			"@group2/pkg-d",
			"@group2/pkg-e",
			"@group3/pkg-f",
			"@group3/pkg-g",
			"@private/pkg-c",
			"@shared/shared",
			"main-release-group-root",
			"other-pkg-a",
			"other-pkg-b",
			"pkg-a",
			"pkg-b",
			"second-release-group-root",
		]);
	});

	it("select directory", async () => {
		const buildProject = await buildProjectPromise;
		const selectionOptions: PackageSelectionCriteria = {
			releaseGroups: ["main"],
			releaseGroupRoots: [],
			workspaces: [],
			workspaceRoots: [],
			directory: "second/packages/other-pkg-a",
			changedSinceBranch: undefined,
		};
		const filters: PackageFilterOptions = {
			private: undefined,
			scope: undefined,
			skipScope: undefined,
		};

		const { selected, filtered } = await selectAndFilterPackages(
			buildProject,
			selectionOptions,
			filters,
		);
		expect(selected).toHaveLength(1);
		expect(filtered).toHaveLength(1);

		const pkg = filtered[0];
		if (!pkg) {
			throw new Error("Expected package not found");
		}

		expect(pkg.name).toBe("other-pkg-a");
		expect(buildProject.relativeToRepo(pkg.directory)).toBe(
			"second/packages/other-pkg-a",
		);
	});

	describe("select release group", () => {
		it("no filters", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				releaseGroups: ["main"],
			};
			const filters: PackageFilterOptions = EmptyFilter;

			const { selected } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = selected.map((p) => p.name);

			expect(names).toEqual([
				"pkg-a",
				"pkg-b",
				"@private/pkg-c",
				"@shared/shared",
			]);
		});

		it("select release group root", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				releaseGroupRoots: ["main"],
			};
			const filters: PackageFilterOptions = EmptyFilter;

			const { selected } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const dirs = selected.map((p) =>
				buildProject.relativeToRepo(p.directory),
			);

			expect(selected.length).toBe(1);
			expect(dirs).toEqual(expect.arrayContaining([""]));
		});

		it("filter private", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				releaseGroups: ["main"],
			};
			const filters: PackageFilterOptions = {
				...EmptyFilter,
				private: true,
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual(expect.arrayContaining(["@private/pkg-c"]));
		});

		it("filter non-private", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				releaseGroups: ["main"],
			};
			const filters: PackageFilterOptions = {
				...EmptyFilter,
				private: false,
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual(["pkg-a", "pkg-b", "@shared/shared"]);
		});

		it("filter scopes", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				releaseGroups: ["main"],
			};
			const filters: PackageFilterOptions = {
				...EmptyFilter,
				scope: ["@shared"],
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual(["@shared/shared"]);
		});

		it("filter skipScopes", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				releaseGroups: ["main"],
			};
			const filters: PackageFilterOptions = {
				...EmptyFilter,
				skipScope: ["@shared", "@private"],
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual(["pkg-a", "pkg-b"]);
		});
	});

	describe("select workspace", () => {
		it("all, no filters", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaces: ["main"],
			};
			const filters: PackageFilterOptions = EmptyFilter;

			const { selected } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = selected.map((p) => p.name);

			expect(names).toEqual([
				"@group2/pkg-d",
				"@group2/pkg-e",
				"@group3/pkg-f",
				"@group3/pkg-g",
				"pkg-a",
				"pkg-b",
				"@private/pkg-c",
				"@shared/shared",
			]);
		});

		it("select workspace root at repo root", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaceRoots: ["main"],
			};
			const filters: PackageFilterOptions = EmptyFilter;

			const { selected } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const dirs = selected.map((p) =>
				buildProject.relativeToRepo(p.directory),
			);

			expect(selected.length).toBe(1);
			expect(dirs).toEqual(expect.arrayContaining([""]));
		});

		it("select workspace root not at repo root", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaceRoots: ["second"],
			};
			const filters: PackageFilterOptions = EmptyFilter;

			const { selected } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const dirs = selected.map((p) =>
				buildProject.relativeToRepo(p.directory),
			);

			expect(selected.length).to.equal(1);
			expect(dirs).toEqual(expect.arrayContaining(["second"]));
		});

		it("filter private", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaces: ["main"],
			};
			const filters: PackageFilterOptions = {
				private: true,
				scope: undefined,
				skipScope: undefined,
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual(expect.arrayContaining(["@private/pkg-c"]));
		});

		it("filter non-private", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaces: ["main"],
			};
			const filters: PackageFilterOptions = {
				private: false,
				scope: undefined,
				skipScope: undefined,
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual([
				"@group2/pkg-d",
				"@group2/pkg-e",
				"@group3/pkg-f",
				"@group3/pkg-g",
				"pkg-a",
				"pkg-b",
				"@shared/shared",
			]);
		});

		it("filter scopes", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaces: ["main"],
			};
			const filters: PackageFilterOptions = {
				private: undefined,
				scope: ["@shared"],
				skipScope: undefined,
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual(["@shared/shared"]);
		});

		it("filter skipScopes", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaces: ["main"],
			};
			const filters: PackageFilterOptions = {
				private: undefined,
				scope: undefined,
				skipScope: ["@shared", "@private", "@group3"],
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual([
				"@group2/pkg-d",
				"@group2/pkg-e",
				"pkg-a",
				"pkg-b",
			]);
		});
	});

	describe("combination workspace and release group", () => {
		const filters: PackageFilterOptions = EmptyFilter;

		it("selects workspace and disjoint release group", async () => {
			const buildProject = await buildProjectPromise;
			const selectionOptions: PackageSelectionCriteria = {
				...EmptySelectionCriteria,
				workspaces: ["second"],
				releaseGroups: ["group2"],
			};

			const { filtered } = await selectAndFilterPackages(
				buildProject,
				selectionOptions,
				filters,
			);
			const names = filtered.map((p) => p.name);

			expect(names).toEqual([
				"other-pkg-a",
				"other-pkg-b",
				"@group2/pkg-d",
				"@group2/pkg-e",
			]);
		});
	});

	it("selects all release groups", async () => {
		const buildProject = await buildProjectPromise;
		const selectionOptions: PackageSelectionCriteria = {
			...EmptySelectionCriteria,
			releaseGroups: ["*"],
		};

		const { filtered } = await selectAndFilterPackages(
			buildProject,
			selectionOptions,
			EmptyFilter,
		);
		const names = filtered.map((p) => p.name).sort();

		expect(names).toEqual(
			[
				"@group2/pkg-d",
				"@group2/pkg-e",
				"@group3/pkg-f",
				"@group3/pkg-g",
				"@private/pkg-c",
				"@shared/shared",
				"other-pkg-a",
				"other-pkg-b",
				"pkg-a",
				"pkg-b",
			].sort(),
		);
	});
});

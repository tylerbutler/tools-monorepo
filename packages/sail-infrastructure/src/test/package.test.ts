import { describe, expect, it } from "vitest";

import { loadBuildProject } from "../buildProject.js";
import type { PackageName } from "../types.js";

import { testRepoRoot } from "./init.js";

describe("package dependencies", () => {
	it("includes peer dependencies with peer depKind", () => {
		const repo = loadBuildProject(testRepoRoot);
		const pkg = repo.packages.get("@group2/pkg-e" as PackageName);
		expect(pkg).toBeDefined();

		if (!pkg) {
			throw new Error("Expected @group2/pkg-e package to exist");
		}

		pkg.packageJson.devDependencies = {
			"dev-only-dependency": "1.0.0",
		};
		pkg.packageJson.peerDependencies = {
			"peer-only-dependency": "2.0.0",
		};

		const dependencies = Array.from(pkg.combinedDependencies);

		expect(
			dependencies.filter(
				(dep) => dep.name === "dev-only-dependency" && dep.depKind === "dev",
			),
		).toHaveLength(1);
		expect(
			dependencies.filter(
				(dep) => dep.name === "peer-only-dependency" && dep.depKind === "peer",
			),
		).toHaveLength(1);
		expect(
			dependencies.some(
				(dep) => dep.name === "dev-only-dependency" && dep.depKind === "peer",
			),
		).toBe(false);
	});
});

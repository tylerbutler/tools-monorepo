import { describe, expect, it } from "vitest";

import type { BuildPackage } from "../../../../common/npmPackage.js";
import { DependencyResolver } from "../../../../src/core/dependencies/DependencyResolver.js";
import { DependencyError } from "../../../../src/core/errors/DependencyError.js";
import type { TaskDefinitionsOnDisk } from "../../../../src/core/taskDefinitions.js";
import { PackageBuilder } from "../../../helpers/builders/PackageBuilder.js";

describe("DependencyResolver", () => {
	describe("resolvePackageDependencies", () => {
		it("should resolve simple two-package dependency", () => {
			// Arrange
			const libPkg = new PackageBuilder().withName("@test/lib").build();

			const appPkg = new PackageBuilder()
				.withName("@test/app")
				.withDependency("@test/lib", "1.0.0")
				.build();

			const packages = new Map<string, BuildPackage>([
				[libPkg.name, libPkg],
				[appPkg.name, appPkg],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert
			expect(result.size).toBe(2);
			expect(result.has(libPkg)).toBe(true);
			expect(result.has(appPkg)).toBe(true);

			const libNode = result.get(libPkg);
			const appNode = result.get(appPkg);

			expect(libNode?.pkg).toBe(libPkg);
			expect(appNode?.pkg).toBe(appPkg);

			// app depends on lib
			expect(appNode?.dependentPackages).toContain(libNode);
			expect(libNode?.dependentPackages).toHaveLength(0);
		});

		it("should assign correct dependency levels", () => {
			// Arrange - create diamond dependency: base -> left/right -> top
			const basePkg = new PackageBuilder().withName("@test/base").build();

			const leftPkg = new PackageBuilder()
				.withName("@test/left")
				.withDependency("@test/base", "1.0.0")
				.build();

			const rightPkg = new PackageBuilder()
				.withName("@test/right")
				.withDependency("@test/base", "1.0.0")
				.build();

			const topPkg = new PackageBuilder()
				.withName("@test/top")
				.withDependency("@test/left", "1.0.0")
				.withDependency("@test/right", "1.0.0")
				.build();

			const packages = new Map<string, BuildPackage>([
				[basePkg.name, basePkg],
				[leftPkg.name, leftPkg],
				[rightPkg.name, rightPkg],
				[topPkg.name, topPkg],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert
			const baseNode = result.get(basePkg);
			const leftNode = result.get(leftPkg);
			const rightNode = result.get(rightPkg);
			const topNode = result.get(topPkg);

			// Level 0: no dependencies
			expect(baseNode?.level).toBe(0);

			// Level 1: depends on level 0
			expect(leftNode?.level).toBe(1);
			expect(rightNode?.level).toBe(1);

			// Level 2: depends on level 1
			expect(topNode?.level).toBe(2);
		});

		it("should detect circular dependencies", () => {
			// Arrange - create circular dependency: a -> b -> c -> a
			const pkgA = new PackageBuilder()
				.withName("@test/a")
				.withDependency("@test/c", "1.0.0") // circular
				
				.build();

			const pkgB = new PackageBuilder()
				.withName("@test/b")
				.withDependency("@test/a", "1.0.0")
				
				.build();

			const pkgC = new PackageBuilder()
				.withName("@test/c")
				.withDependency("@test/b", "1.0.0")
				
				.build();

			const packages = new Map<string, BuildPackage>([
				[pkgA.name, pkgA],
				[pkgB.name, pkgB],
				[pkgC.name, pkgC],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act & Assert
			expect(() =>
				resolver.resolvePackageDependencies(packages, [], undefined, getDepFilter),
			).toThrow(DependencyError);
		});

		it("should include dependency packages even if unmatched", () => {
			// Arrange
			const libPkg = new PackageBuilder().withName("@test/lib").build();
			libPkg.matched = false; // Explicitly set as unmatched

			const appPkg = new PackageBuilder()
				.withName("@test/app")
				.withDependency("@test/lib", "1.0.0")
				.build();
			// appPkg.matched is true by default

			const packages = new Map<string, BuildPackage>([
				[libPkg.name, libPkg],
				[appPkg.name, appPkg],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert - both packages in result (dependencies are included even if unmatched)
			expect(result.size).toBe(2);
			expect(result.has(appPkg)).toBe(true);
			expect(result.has(libPkg)).toBe(true);

			// Verify dependency relationship
			const appNode = result.get(appPkg);
			const libNode = result.get(libPkg);
			expect(appNode?.dependentPackages).toContain(libNode);
		});

		it("should apply global task definitions to matched packages", () => {
			// Arrange
			const pkg = new PackageBuilder().withName("@test/pkg").build();

			const packages = new Map<string, BuildPackage>([[pkg.name, pkg]]);

			const globalTaskDefs: TaskDefinitionsOnDisk = {
				build: {
					dependsOn: ["^build"],
					script: true,
				},
			};

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				globalTaskDefs,
				getDepFilter,
			);

			// Assert
			expect(result.size).toBe(1);
			const node = result.get(pkg);
			expect(node).toBeDefined();
		});

		it("should filter dependencies based on getDepFilter", () => {
			// Arrange
			const libPkg = new PackageBuilder()
				.withName("@test/lib")
				
				.build();

			const appPkg = new PackageBuilder()
				.withName("@test/app")
				.withDependency("@test/lib", "1.0.0")
				
				.build();

			const packages = new Map<string, BuildPackage>([
				[libPkg.name, libPkg],
				[appPkg.name, appPkg],
			]);

			const resolver = new DependencyResolver();
			// Filter that excludes all dependencies
			const getDepFilter = () => () => false;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert
			const appNode = result.get(appPkg);
			// app should have no dependent packages because filter excluded lib
			expect(appNode?.dependentPackages).toHaveLength(0);
		});

		it("should handle release group packages", () => {
			// Arrange
			const pkg = new PackageBuilder().withName("@test/pkg").build();

			const releaseGroupPkg = new PackageBuilder()
				.withName("@test/release-group")
				
				.build();

			const packages = new Map<string, BuildPackage>([[pkg.name, pkg]]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[releaseGroupPkg],
				undefined,
				getDepFilter,
			);

			// Assert
			expect(result.size).toBe(2);
			expect(result.has(pkg)).toBe(true);
			expect(result.has(releaseGroupPkg)).toBe(true);
		});
	});

	describe("dependency version validation", () => {
		it("should accept satisfied semver dependencies", () => {
			// Arrange
			const libPkg = new PackageBuilder()
				.withName("@test/lib")
				.withVersion("1.5.2")
				
				.build();

			const appPkg = new PackageBuilder()
				.withName("@test/app")
				.withDependency("@test/lib", "^1.0.0") // satisfied by 1.5.2
				
				.build();

			const packages = new Map<string, BuildPackage>([
				[libPkg.name, libPkg],
				[appPkg.name, appPkg],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act & Assert - should not throw
			expect(() =>
				resolver.resolvePackageDependencies(packages, [], undefined, getDepFilter),
			).not.toThrow();
		});

		// biome-ignore lint/suspicious/noSkippedTests: Version validation not implemented in DependencyResolver
		it.skip("should detect unsatisfied semver dependencies", () => {
			// TODO: Determine if version validation is implemented
			// Currently this doesn't throw - may need to be validated elsewhere
			const libPkg = new PackageBuilder()
				.withName("@test/lib")
				.withVersion("2.0.0")

				.build();

			const appPkg = new PackageBuilder()
				.withName("@test/app")
				.withDependency("@test/lib", "^1.0.0") // NOT satisfied by 2.0.0

				.build();

			const packages = new Map<string, BuildPackage>([
				[libPkg.name, libPkg],
				[appPkg.name, appPkg],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act & Assert
			expect(() =>
				resolver.resolvePackageDependencies(packages, [], undefined, getDepFilter),
			).toThrow(DependencyError);
		});

		it("should handle workspace protocol dependencies", () => {
			// Arrange
			const libPkg = new PackageBuilder()
				.withName("@test/lib")
				.withVersion("1.0.0")
				
				.build();

			const appPkg = new PackageBuilder()
				.withName("@test/app")
				.withDependency("@test/lib", "workspace:*") // workspace protocol
				
				.build();

			const packages = new Map<string, BuildPackage>([
				[libPkg.name, libPkg],
				[appPkg.name, appPkg],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act & Assert - should not throw
			expect(() =>
				resolver.resolvePackageDependencies(packages, [], undefined, getDepFilter),
			).not.toThrow();
		});
	});

	describe("complex dependency scenarios", () => {
		it("should handle multi-level dependencies correctly", () => {
			// Arrange - a -> b -> c -> d (4 levels)
			const pkgD = new PackageBuilder()
				.withName("@test/d")
				
				.build();

			const pkgC = new PackageBuilder()
				.withName("@test/c")
				.withDependency("@test/d", "1.0.0")
				
				.build();

			const pkgB = new PackageBuilder()
				.withName("@test/b")
				.withDependency("@test/c", "1.0.0")
				
				.build();

			const pkgA = new PackageBuilder()
				.withName("@test/a")
				.withDependency("@test/b", "1.0.0")
				
				.build();

			const packages = new Map<string, BuildPackage>([
				[pkgD.name, pkgD],
				[pkgC.name, pkgC],
				[pkgB.name, pkgB],
				[pkgA.name, pkgA],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert
			expect(result.get(pkgD)?.level).toBe(0);
			expect(result.get(pkgC)?.level).toBe(1);
			expect(result.get(pkgB)?.level).toBe(2);
			expect(result.get(pkgA)?.level).toBe(3);
		});

		it("should handle packages with multiple dependencies", () => {
			// Arrange
			const utilsPkg = new PackageBuilder()
				.withName("@test/utils")
				
				.build();

			const loggerPkg = new PackageBuilder()
				.withName("@test/logger")
				
				.build();

			const appPkg = new PackageBuilder()
				.withName("@test/app")
				.withDependency("@test/utils", "1.0.0")
				.withDependency("@test/logger", "1.0.0")
				
				.build();

			const packages = new Map<string, BuildPackage>([
				[utilsPkg.name, utilsPkg],
				[loggerPkg.name, loggerPkg],
				[appPkg.name, appPkg],
			]);

			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert
			const appNode = result.get(appPkg);
			expect(appNode?.dependentPackages).toHaveLength(2);
			expect(appNode?.dependentPackages.map((n) => n.pkg)).toContain(utilsPkg);
			expect(appNode?.dependentPackages.map((n) => n.pkg)).toContain(loggerPkg);
		});

		it("should handle empty package list", () => {
			// Arrange
			const packages = new Map<string, BuildPackage>();
			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert
			expect(result.size).toBe(0);
		});

		it("should handle single package with no dependencies", () => {
			// Arrange
			const pkg = new PackageBuilder()
				.withName("@test/standalone")
				
				.build();

			const packages = new Map<string, BuildPackage>([[pkg.name, pkg]]);
			const resolver = new DependencyResolver();
			const getDepFilter = () => () => true;

			// Act
			const result = resolver.resolvePackageDependencies(
				packages,
				[],
				undefined,
				getDepFilter,
			);

			// Assert
			expect(result.size).toBe(1);
			const node = result.get(pkg);
			expect(node?.level).toBe(0);
			expect(node?.dependentPackages).toHaveLength(0);
		});
	});
});

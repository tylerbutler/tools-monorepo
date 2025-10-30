import type { BuildPackage } from "../../common/npmPackage.js";
import type { TaskDefinitionsOnDisk } from "../taskDefinitions.js";

/**
 * Dependency node interface representing a package in the dependency graph
 */
export interface IDependencyNode {
	pkg: BuildPackage;
	dependentPackages: IDependencyNode[];
	level: number;
}

/**
 * Dependency resolver interface for resolving package dependencies and building the dependency graph
 */
export interface IDependencyResolver {
	/**
	 * Resolves package dependencies and builds the dependency graph
	 */
	resolvePackageDependencies(
		packages: ReadonlyMap<string, BuildPackage>,
		releaseGroupPackages: BuildPackage[],
		globalTaskDefinitionsOnDisk: TaskDefinitionsOnDisk | undefined,
		getDepFilter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
	): Map<BuildPackage, IDependencyNode>;

	/**
	 * Validates the dependency graph for circular references and other issues
	 */
	validateDependencies(): boolean;
}

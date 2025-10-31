import registerDebug from "debug";
import semver from "semver";

import { BuildPackage } from "../../common/npmPackage.js";
import { DependencyError } from "../errors/DependencyError.js";
import type {
	IDependencyNode,
	IDependencyResolver,
} from "../interfaces/index.js";
import type {
	TaskDefinitions,
	TaskDefinitionsOnDisk,
} from "../taskDefinitions.js";
import { normalizeGlobalTaskDefinitions } from "../taskDefinitions.js";

const traceGraph = registerDebug("sail:graph");

export interface DependencyNode extends IDependencyNode {
	pkg: BuildPackage;
	dependentPackages: DependencyNode[];
	level: number;
}

export class DependencyResolver implements IDependencyResolver {
	private buildPackages = new Map<BuildPackage, DependencyNode>();

	public resolvePackageDependencies(
		packages: ReadonlyMap<string, BuildPackage>,
		releaseGroupPackages: BuildPackage[],
		globalTaskDefinitionsOnDisk: TaskDefinitionsOnDisk | undefined,
		getDepFilter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
	): Map<BuildPackage, IDependencyNode> {
		const globalTaskDefinitions = normalizeGlobalTaskDefinitions(
			globalTaskDefinitionsOnDisk,
		);

		this.initializeMatchedPackages(
			packages,
			releaseGroupPackages,
			globalTaskDefinitions,
		);
		this.createDependentPackages(packages, globalTaskDefinitions, getDepFilter);
		this.populateLevel();

		return this.buildPackages as Map<BuildPackage, IDependencyNode>;
	}

	private initializeMatchedPackages(
		packages: ReadonlyMap<string, BuildPackage>,
		releaseGroupPackages: BuildPackage[],
		globalTaskDefinitions: TaskDefinitions,
	): void {
		// Initialize matched packages
		for (const pkg of packages.values()) {
			if (pkg.matched) {
				this.getOrCreateDependencyNode(pkg, globalTaskDefinitions);
			}
		}

		// Initialize release group packages
		for (const releaseGroupPackage of releaseGroupPackages) {
			if (releaseGroupPackage.matched) {
				this.getOrCreateDependencyNode(releaseGroupPackage, {});
			}
		}

		traceGraph("package created");
	}

	private createDependentPackages(
		packages: ReadonlyMap<string, BuildPackage>,
		globalTaskDefinitions: TaskDefinitions,
		getDepFilter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
	): void {
		const pendingInitDep: DependencyNode[] = [...this.buildPackages.values()];

		while (true) {
			const node = pendingInitDep.pop();
			if (node === undefined) {
				break;
			}

			if (node.pkg.isReleaseGroupRoot) {
				this.processReleaseGroupDependencies(
					node,
					globalTaskDefinitions,
					pendingInitDep,
				);
			} else {
				this.processPackageDependencies(
					node,
					packages,
					globalTaskDefinitions,
					getDepFilter,
					pendingInitDep,
				);
			}
		}

		traceGraph("package dependencies initialized");
	}

	private processReleaseGroupDependencies(
		node: DependencyNode,
		globalTaskDefinitions: TaskDefinitions,
		pendingInitDep: DependencyNode[],
	): void {
		for (const dep of node.pkg.workspace.packages) {
			const depBuildPkg = new BuildPackage(dep);
			traceGraph(
				`Package dependency: ${node.pkg.nameColored} => ${dep.nameColored}`,
			);
			node.dependentPackages.push(
				this.getOrCreateDependencyNode(
					depBuildPkg,
					globalTaskDefinitions,
					pendingInitDep,
				),
			);
		}
	}

	private processPackageDependencies(
		node: DependencyNode,
		packages: ReadonlyMap<string, BuildPackage>,
		globalTaskDefinitions: TaskDefinitions,
		getDepFilter: (pkg: BuildPackage) => (dep: BuildPackage) => boolean,
		pendingInitDep: DependencyNode[],
	): void {
		const depFilter = getDepFilter(node.pkg);

		for (const { name, version } of node.pkg.combinedDependencies) {
			const dep = packages.get(name);
			if (dep) {
				const satisfied = this.isDependencyVersionSatisfied(dep, version);
				if (satisfied) {
					if (depFilter(dep)) {
						traceGraph(
							`Package dependency: ${node.pkg.nameColored} => ${dep.nameColored}`,
						);
						node.dependentPackages.push(
							this.getOrCreateDependencyNode(
								dep,
								globalTaskDefinitions,
								pendingInitDep,
							),
						);
					} else {
						traceGraph(
							`Package dependency skipped: ${node.pkg.nameColored} => ${dep.nameColored}`,
						);
					}
				} else {
					traceGraph(
						`Package dependency version mismatch: ${node.pkg.nameColored} => ${dep.nameColored}`,
					);
				}
			}
		}
	}

	private isDependencyVersionSatisfied(
		dep: BuildPackage,
		version: string,
	): boolean {
		return (
			version.startsWith("workspace:") || semver.satisfies(dep.version, version)
		);
	}

	private getOrCreateDependencyNode(
		pkg: BuildPackage,
		_globalTaskDefinitions: TaskDefinitions,
		pendingInitDep?: DependencyNode[],
	): DependencyNode {
		let node = this.buildPackages.get(pkg);
		if (node === undefined) {
			node = {
				pkg,
				dependentPackages: [],
				level: -1,
			};
			this.buildPackages.set(pkg, node);
			if (pendingInitDep) {
				pendingInitDep.push(node);
			}
		}
		return node;
	}

	private populateLevel(): void {
		const getLevel = (
			node: DependencyNode,
			parent?: DependencyNode,
		): number => {
			if (node.level === -2) {
				const packageChain = parent
					? [parent.pkg.nameColored, node.pkg.nameColored]
					: [node.pkg.nameColored];
				throw DependencyError.circularPackageDependency(
					packageChain,
					node.pkg.nameColored,
				);
			}
			if (node.level !== -1) {
				return node.level;
			}

			node.level = -2;
			let maxChildrenLevel = -1;
			for (const child of node.dependentPackages) {
				maxChildrenLevel = Math.max(maxChildrenLevel, getLevel(child, node));
			}
			node.level = maxChildrenLevel + 1;
			return maxChildrenLevel + 1;
		};

		for (const node of this.buildPackages.values()) {
			getLevel(node);
		}
		traceGraph("package dependency level initialized");
	}

	public validateDependencies(): boolean {
		for (const node of this.buildPackages.values()) {
			if (node.level === -1) {
				throw DependencyError.missingPackageDependency(
					node.pkg.nameColored,
					node.pkg.nameColored,
				);
			}
		}
		return true;
	}
}

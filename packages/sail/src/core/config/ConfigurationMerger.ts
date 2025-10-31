import type {
	IConfigurationMerger,
	IDependencyFilters,
	IMutableTaskDefinitions,
} from "../interfaces/index.js";
import type {
	TaskDefinitions,
	TaskDefinitionsOnDisk,
} from "../taskDefinitions.js";
import { getFullTaskConfig } from "./taskDefinitionUtils.js";

/**
 * Expands "..." in configuration arrays to include inherited dependencies
 */
function expandDotDotDot(
	config: readonly string[],
	inherited: readonly string[] | undefined,
): string[] {
	const expanded = config.filter((value) => value !== "...");
	if (inherited !== undefined && expanded.length !== config.length) {
		return expanded.concat(inherited);
	}
	return expanded;
}

/**
 * ConfigurationMerger handles merging global and package-specific task configurations.
 */
export class ConfigurationMerger implements IConfigurationMerger {
	/**
	 * Merges global task definitions with package-specific configurations
	 */
	public mergeTaskDefinitions(
		globalTaskDefinitions: TaskDefinitions,
		packageTaskDefinitions: TaskDefinitionsOnDisk | undefined,
		packageScripts: Record<string, string | undefined>,
		filters: IDependencyFilters,
	): IMutableTaskDefinitions {
		const taskDefinitions: IMutableTaskDefinitions = {};

		// Initialize from global task definitions
		this.initializeFromGlobalDefinitions(
			taskDefinitions,
			globalTaskDefinitions,
			packageScripts,
			filters,
		);

		// Override with package-specific definitions
		if (packageTaskDefinitions) {
			this.mergePackageDefinitions(taskDefinitions, packageTaskDefinitions);
		}

		return taskDefinitions;
	}

	/**
	 * Merges configuration arrays using the "..." expansion syntax
	 */
	public mergeConfigurationArrays(
		packageConfig: readonly string[],
		globalConfig: readonly string[] | undefined,
	): string[] {
		return expandDotDotDot(packageConfig, globalConfig);
	}

	private initializeFromGlobalDefinitions(
		taskDefinitions: IMutableTaskDefinitions,
		globalTaskDefinitions: TaskDefinitions,
		packageScripts: Record<string, string | undefined>,
		filters: IDependencyFilters,
	): void {
		for (const name in globalTaskDefinitions) {
			if (!Object.hasOwn(globalTaskDefinitions, name)) {
				continue;
			}
			const globalTaskDefinition = globalTaskDefinitions[name];

			// Skip script tasks if the package doesn't have the script
			if (globalTaskDefinition.script && packageScripts[name] === undefined) {
				continue;
			}

			// Only keep task or script references that exist and make array clones
			taskDefinitions[name] = {
				dependsOn: globalTaskDefinition.dependsOn.filter(filters.globalAllow),
				script: globalTaskDefinition.script,
				before: globalTaskDefinition.before.filter(
					filters.globalAllowExpansionsStar,
				),
				children: [], // children are not inherited from global task definitions
				after: globalTaskDefinition.after.filter(
					filters.globalAllowExpansionsStar,
				),
			};
		}
	}

	private mergePackageDefinitions(
		taskDefinitions: IMutableTaskDefinitions,
		packageTaskDefinitions: TaskDefinitionsOnDisk,
	): void {
		for (const name in packageTaskDefinitions) {
			if (!Object.hasOwn(packageTaskDefinitions, name)) {
				continue;
			}
			const packageTaskDefinition = packageTaskDefinitions[name];
			const full = getFullTaskConfig(packageTaskDefinition);
			const currentTaskConfig = taskDefinitions[name];

			// Merge configuration arrays with "..." expansion
			full.dependsOn = this.mergeConfigurationArrays(
				full.dependsOn,
				currentTaskConfig?.dependsOn,
			);
			full.before = this.mergeConfigurationArrays(
				full.before,
				currentTaskConfig?.before,
			);
			full.after = this.mergeConfigurationArrays(
				full.after,
				currentTaskConfig?.after,
			);

			taskDefinitions[name] = full;
		}
	}
}

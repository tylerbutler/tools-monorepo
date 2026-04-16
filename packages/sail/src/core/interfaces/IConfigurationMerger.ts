import type {
	TaskConfig,
	TaskDefinitions,
	TaskDefinitionsOnDisk,
} from "../taskDefinitions.js";
import type { IDependencyFilters } from "./IConfigurationParser.js";

/**
 * Mutable task configuration for internal processing
 */
export type IMutableTaskConfig = {
	-readonly [P in keyof TaskConfig]: TaskConfig[P];
};

/**
 * Mutable task definitions collection
 */
export interface IMutableTaskDefinitions {
	[name: string]: IMutableTaskConfig;
}

/**
 * Configuration merger interface for merging global and package-specific task configurations
 */
export interface IConfigurationMerger {
	/**
	 * Merges global task definitions with package-specific configurations
	 */
	mergeTaskDefinitions(
		globalTaskDefinitions: TaskDefinitions,
		packageTaskDefinitions: TaskDefinitionsOnDisk | undefined,
		packageScripts: Record<string, string | undefined>,
		filters: IDependencyFilters,
	): IMutableTaskDefinitions;

	/**
	 * Merges configuration arrays using the "..." expansion syntax
	 */
	mergeConfigurationArrays(
		packageConfig: readonly string[],
		globalConfig: readonly string[] | undefined,
	): string[];
}

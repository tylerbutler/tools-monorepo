import type { SailPackageJson } from "../../common/npmPackage.js";
/**
 * Package configuration extracted from package.json
 */
import type {
	TaskConfig,
	TaskDefinitions,
	TaskDefinitionsOnDisk,
} from "../taskDefinitions.js";

export interface IPackageConfiguration {
	scripts: Record<string, string | undefined>;
	taskDefinitions?: TaskDefinitionsOnDisk;
}

/**
 * Dependency filter functions for task validation
 */
export interface IDependencyFilters {
	globalAllow: (value: string) => boolean;
	globalAllowExpansionsStar: (value: string) => boolean;
}

/**
 * Dependency validation functions
 */
export interface IDependencyValidators {
	invalidDependOn: (value: string) => boolean;
	invalidBefore: (value: string) => boolean;
	invalidAfter: (value: string) => boolean;
}

/**
 * Configuration parser interface for parsing and validating task configurations
 */
export interface IConfigurationParser {
	/**
	 * Extracts package configuration from package.json
	 */
	parsePackageConfiguration(json: SailPackageJson): IPackageConfiguration;

	/**
	 * Validates task configuration and throws appropriate errors
	 */
	validateTaskConfiguration(
		name: string,
		config: TaskConfig,
		packageScripts: Record<string, string | undefined>,
	): void;

	/**
	 * Creates filter functions for dependency validation
	 */
	createDependencyFilters(
		globalTaskDefinitions: TaskDefinitions,
		packageScripts: Record<string, string | undefined>,
	): IDependencyFilters;

	/**
	 * Creates validation functions for task dependencies
	 */
	createDependencyValidators(
		taskDefinitions: Record<string, TaskConfig>,
		packageScripts: Record<string, string | undefined>,
		isReleaseGroupRoot: boolean,
	): IDependencyValidators;
}

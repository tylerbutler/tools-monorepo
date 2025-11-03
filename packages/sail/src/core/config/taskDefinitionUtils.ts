import type {
	MutableTaskConfig,
	TaskConfigOnDisk,
	TaskDependencies,
} from "../taskDefinitions.js";

/**
 * Type guard to check if a TaskConfigOnDisk is actually a TaskDependencies array
 */
const isTaskDependencies = (
	value: TaskConfigOnDisk,
): value is TaskDependencies => {
	return Array.isArray(value);
};

/**
 * Helper to clone an array or return empty array if undefined
 */
const makeClonedOrEmptyArray = <T>(value: readonly T[] | undefined): T[] =>
	value ? [...value] : [];

/**
 * Convert and fill out default values from TaskConfigOnDisk to TaskConfig in memory
 * @param config TaskConfig info loaded from a file
 * @returns TaskConfig filled out with default values
 */
export function getFullTaskConfig(config: TaskConfigOnDisk): MutableTaskConfig {
	if (isTaskDependencies(config)) {
		return {
			dependsOn: [...config],
			script: true,
			before: [],
			children: [],
			after: [],
		};
	}

	return {
		dependsOn: makeClonedOrEmptyArray(config.dependsOn),
		script: config.script ?? true,
		before: makeClonedOrEmptyArray(config.before),
		children: [],
		after: makeClonedOrEmptyArray(config.after),
	};
}

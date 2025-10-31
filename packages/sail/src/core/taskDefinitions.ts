import type { SailPackageJson } from "../common/npmPackage.js";
import { ScriptAnalyzer } from "./analysis/ScriptAnalyzer.js";
import { TaskDefinitionCache } from "./cache/TaskDefinitionCache.js";
import { ConfigurationMerger } from "./config/ConfigurationMerger.js";
import { ConfigurationParser } from "./config/ConfigurationParser.js";
import { getFullTaskConfig } from "./config/taskDefinitionUtils.js";
import {
	isConcurrentlyCommand,
	parseConcurrentlyCommand,
} from "./parseCommands.js";

/**
 * Task definitions (type `TaskDefinitions`) is an object describing build tasks for Sail.
 * Task names are represented as property name on the object and the value the task configuration
 * (type `TaskConfig`). Task configuration can a plain array of string, presenting the task's
 * dependencies or a full description (type `TaskConfigFull`).
 */
export interface TaskDefinitions {
	readonly [name: string]: TaskConfig;
}

/**
 * Task Name is a simple string that is normally a script name in the package.json.
 */
type TaskName = string;

type AnyTaskName = "*";

type PackageName = string;

/**
 * Task Dependencies Expansion:
 * When specify task dependencies, the following syntax is supported:
 * - "<name>": another task within the package
 * - "^<name>": all the task with the name in dependent packages.
 * - "*": any other task within the package (for 'before' and 'after' only, not allowed in 'dependsOn')
 * - "^*": all the task in the dependent packages (for 'after' only, not allowed in 'dependsOn' or 'before')
 *
 * When task definition is augmented in the package.json itself, the dependencies can also be:
 * - "<package>#<name>": specific dependent package's task
 * - "...": expand to the dependencies in global fluidBuild config (default is override)
 */
type TaskDependency =
	| TaskName
	| AnyTaskName
	| `^${TaskName | AnyTaskName}`
	| `${PackageName}#${TaskName | AnyTaskName}`
	| "...";

export type TaskDependencies = readonly TaskDependency[];

export interface TaskConfig {
	/**
	 * Task dependencies as a plain string array. Matched task will be scheduled to run before the current task.
	 * The strings specify dependencies for the task. See Task Dependencies Expansion above for details.
	 */
	readonly dependsOn: TaskDependencies;

	/**
	 * Tasks that needs to run before the current task (example clean). See Task Dependencies Expansion above for
	 * details. As compared to "dependsOn", "before" is a weak dependency. It will only affect ordering if matched task is already
	 * scheduled. It won't cause the matched tasks to be scheduled if it isn't already.
	 *
	 * Notes 'before' is disallowed for non-script tasks since it has no effect on non-script tasks as they has no
	 * action to perform.
	 */
	readonly before: TaskDependencies;

	/**
	 * Tasks that this task includes. The children tasks will be scheduled to
	 * run under the current task. Thus any tasks that depend on this will
	 * satisfy a requirement of dependency on the children tasks.
	 *
	 * This should not be custom specified but derived from definition.
	 */
	readonly children: readonly TaskName[];

	/**
	 * Tasks that needs to run after the current task (example copy tasks). See Task Dependencies Expansion above for
	 * details. As compared to "dependsOn", "after" is a weak dependency. It will only affect ordering if matched task is already
	 * scheduled. It won't cause the matched tasks to be scheduled if it isn't already.
	 *
	 * Notes 'after' is disallowed for non-script tasks since it has no effect on non-script tasks as they has no
	 * action to perform.
	 */
	readonly after: TaskDependencies;

	/**
	 * Specify whether this is a script task or not. Default to true when this is omitted
	 * in the config file, or the task's config is just a plain string array.
	 *
	 * If true, the task will match with the script it the package.json and invoke
	 * the command once all the task's dependencies are satisfied.
	 *
	 * If false, the task will only trigger the dependencies (and not look for the script in package.json).
	 * It can be used as an alias to a group of tasks.
	 */
	readonly script: boolean;
}

/**
 * Inverse of Readonly, make all fields mutable.
 */
type Mutable<T> = { -readonly [P in keyof T]: T[P] };

export type MutableTaskConfig = Mutable<TaskConfig>;

// On file versions that allow fields to be omitted
export type TaskConfigOnDisk =
	| TaskDependencies
	| Omit<Partial<TaskConfig>, "children">;
export interface TaskDefinitionsOnDisk {
	readonly [name: TaskName]: TaskConfigOnDisk;
}

// Re-export getFullTaskConfig from utilities module
export { getFullTaskConfig } from "./config/taskDefinitionUtils.js";

// Known task names
export const defaultBuildTaskName = "build";
export const defaultCleanTaskName = "clean";

// Default task definitions (for non root tasks).  User task config will override these.
//
// clean:
// - For "clean", just assume that it needs to before all other tasks
//
// All other tasks:
// - Follow the topological order of the package and wait until all the task for the other
//   packages first (i.e. after: ["^*"]).
// - These default dependencies for "before" and "after" propagate differently in a group task, where only
//   subtasks that has no name inherit the dependency. (where as normally, all subtask does)
//	 (i.e. isDefault: true)

export type TaskDefinition = TaskConfig & { readonly isDefault?: boolean };

/**
 * Get the default task definition for the given task name
 * @param taskName task name
 * @returns default task definition
 */
export function getDefaultTaskDefinition(taskName: string): TaskDefinition {
	return taskName === defaultCleanTaskName
		? defaultCleanTaskDefinition
		: defaultTaskDefinition;
}

const defaultTaskDefinition = {
	dependsOn: [],
	script: true,
	before: [],
	children: [],
	after: ["^*"], // TODO: include "*" so the user configured task will run first, but we need to make sure it doesn't cause circular dependency first
	isDefault: true, // only propagate to unnamed sub tasks if it is a group task
} as const satisfies TaskDefinition;
const defaultCleanTaskDefinition = {
	dependsOn: [],
	script: true,
	before: ["*"], // clean are ran before all the tasks, add a week dependency.
	children: [],
	after: [],
} as const satisfies TaskDefinition;

const detectInvalid = (
	config: readonly string[],
	isInvalid: (value: string) => boolean,
	name: string,
	kind: string,
	isGlobal: boolean,
) => {
	const invalid = config.filter((value) => isInvalid(value));
	if (invalid.length > 0) {
		throw new Error(
			`Invalid '${kind}' dependencies '${invalid.join()}' for${
				isGlobal ? " global" : ""
			} task definition ${name}`,
		);
	}
};

export function normalizeGlobalTaskDefinitions(
	globalTaskDefinitionsOnDisk: TaskDefinitionsOnDisk | undefined,
): TaskDefinitions {
	// Normalize all on disk config to full config and validate
	const taskDefinitions: MutableTaskDefinitions = {};
	if (globalTaskDefinitionsOnDisk) {
		for (const name of Object.keys(globalTaskDefinitionsOnDisk)) {
			const full = getFullTaskConfig(globalTaskDefinitionsOnDisk[name]);
			if (!full.script && (full.before.length > 0 || full.after.length > 0)) {
				throw new Error(
					`Non-script global task definition '${name}' cannot have 'before' or 'after'`,
				);
			}
			detectInvalid(
				full.dependsOn,
				(value) =>
					value === "..." ||
					value.includes("#") ||
					value === "*" ||
					value === "^*",
				name,
				"dependsOn",
				true,
			);
			detectInvalid(
				full.before,
				(value) => value === "..." || value.includes("#") || value === "^*",
				name,
				"before",
				true,
			);
			detectInvalid(
				full.after,
				(value) => value === "..." || value.includes("#"),
				name,
				"after",
				true,
			);
			taskDefinitions[name] = full;
		}
	}
	return taskDefinitions;
}

function _expandDotDotDot(
	config: readonly string[],
	inherited: readonly string[],
) {
	const expanded = config.filter((value) => value !== "...");
	if (inherited !== undefined && expanded.length !== config.length) {
		return expanded.concat(inherited);
	}
	return expanded;
}

/**
 * Extracts the all of the directly called scripts from a command line.
 * @param script - command line to parse
 * @param allScriptNames - all the script names in the package.json
 * @returns elements of script that are other scripts
 */
function _getDirectlyCalledScripts(
	script: string,
	allScriptNames: string[],
): string[] {
	const directlyCalledScripts: string[] = [];
	const commands = script.split("&&");
	for (const step of commands) {
		const commandLine = step.trim();
		if (isConcurrentlyCommand(commandLine)) {
			parseConcurrentlyCommand(
				commandLine,
				allScriptNames,
				(scriptName: string) => {
					directlyCalledScripts.push(scriptName);
				},
				() => {
					// TODO: Review if direct command callback needs implementation
				},
			);
		} else if (commandLine.startsWith("npm run ")) {
			const scriptName = commandLine.substring("npm run ".length);
			if (scriptName.includes(" ")) {
				// If the "script name" has a space, it is a "direct" call, but probably
				// has additional arguments that change exact execution of the script
				// and therefore is excluded as a "direct" call.
			} else if (allScriptNames.includes(scriptName)) {
				directlyCalledScripts.push(scriptName);
			} else {
				// This may not be relevant to the calling context, but there aren't
				// any known reasons why this should be preserved; so raise as an error.
				throw new Error(
					`Script '${scriptName}' not found processing command line: '${script}'`,
				);
			}
		}
	}
	return directlyCalledScripts;
}

// Global cache instance for task definitions
const taskDefinitionCache = new TaskDefinitionCache();

/**
 * Combine and fill in default values for task definitions for a package.
 * @param json package.json content for the package
 * @param globalTaskDefinitions global task definitions to merge with
 * @param options configuration options
 * @returns full task definitions for the package.
 */
export function getTaskDefinitions(
	json: SailPackageJson,
	globalTaskDefinitions: TaskDefinitions,
	{ isReleaseGroupRoot }: { isReleaseGroupRoot: boolean },
): TaskDefinitions {
	// Use cache to avoid recomputation
	return taskDefinitionCache.getTaskDefinitions(
		json,
		globalTaskDefinitions,
		{ isReleaseGroupRoot },
		() =>
			computeTaskDefinitions(json, globalTaskDefinitions, {
				isReleaseGroupRoot,
			}),
	);
}

/**
 * Internal function to compute task definitions (cached by getTaskDefinitions)
 */
function computeTaskDefinitions(
	json: SailPackageJson,
	globalTaskDefinitions: TaskDefinitions,
	{ isReleaseGroupRoot }: { isReleaseGroupRoot: boolean },
): TaskDefinitions {
	const parser = new ConfigurationParser();
	const merger = new ConfigurationMerger();
	const scriptAnalyzer = new ScriptAnalyzer();

	// Parse package configuration
	const packageConfig = parser.parsePackageConfiguration(json);

	// Create dependency filters
	const filters = parser.createDependencyFilters(
		globalTaskDefinitions,
		packageConfig.scripts,
	);

	// Merge global and package task definitions
	const taskDefinitions = merger.mergeTaskDefinitions(
		globalTaskDefinitions,
		packageConfig.taskDefinitions,
		packageConfig.scripts,
		filters,
	);

	// Validate only package-specific task configurations (not global ones)
	// This preserves the original behavior where global tasks can invoke fluid-build
	// but package-specific tasks cannot (to prevent infinite recursion)
	if (packageConfig.taskDefinitions) {
		validatePackageTaskConfigurations(
			parser,
			packageConfig.taskDefinitions,
			packageConfig.scripts,
		);
	}

	// Validate dependencies
	validateTaskDependencies(
		parser,
		taskDefinitions,
		packageConfig.scripts,
		isReleaseGroupRoot,
	);

	// Add children task definitions from script analysis
	addScriptChildrenDefinitions(
		scriptAnalyzer,
		taskDefinitions,
		packageConfig.scripts,
	);

	return taskDefinitions;
}

type MutableTaskDefinitions = {
	[name: string]: MutableTaskConfig;
};

/**
 * Validates only package-specific task configurations (not global ones)
 * This preserves the original behavior where global tasks can invoke fluid-build
 * but package-specific tasks cannot (to prevent infinite recursion)
 */
function validatePackageTaskConfigurations(
	parser: ConfigurationParser,
	packageTaskDefinitions: TaskDefinitionsOnDisk,
	packageScripts: Record<string, string | undefined>,
): void {
	for (const [name, configOnDisk] of Object.entries(packageTaskDefinitions)) {
		const config = getFullTaskConfig(configOnDisk);
		parser.validateTaskConfiguration(name, config, packageScripts);
	}
}

/**
 * Validates task dependencies to ensure they reference valid tasks or scripts
 */
function validateTaskDependencies(
	parser: ConfigurationParser,
	taskDefinitions: MutableTaskDefinitions,
	packageScripts: Record<string, string | undefined>,
	isReleaseGroupRoot: boolean,
): void {
	const validators = parser.createDependencyValidators(
		taskDefinitions,
		packageScripts,
		isReleaseGroupRoot,
	);

	for (const [name, taskDefinition] of Object.entries(taskDefinitions)) {
		detectInvalid(
			taskDefinition.dependsOn,
			validators.invalidDependOn,
			name,
			"dependsOn",
			false,
		);
		detectInvalid(
			taskDefinition.before,
			validators.invalidBefore,
			name,
			"before",
			false,
		);
		detectInvalid(
			taskDefinition.after,
			validators.invalidAfter,
			name,
			"after",
			false,
		);
	}
}

/**
 * Adds children task definitions based on script analysis
 */
function addScriptChildrenDefinitions(
	scriptAnalyzer: ScriptAnalyzer,
	taskDefinitions: MutableTaskDefinitions,
	packageScripts: Record<string, string | undefined>,
): void {
	const scriptDependencies =
		scriptAnalyzer.analyzeScriptDependencies(packageScripts);

	for (const [name, directlyCalledScripts] of Object.entries(
		scriptDependencies,
	)) {
		const taskDefinition = taskDefinitions[name];
		if (taskDefinition === undefined) {
			taskDefinitions[name] = {
				dependsOn: [],
				before: [],
				children: directlyCalledScripts,
				after: [],
				script: true,
			};
		} else {
			// Confirm `children` is not specified in the manual task specifications
			if (taskDefinition.children.length > 0) {
				throw new Error(
					`'children' is not expected in manual task definition for '${name}'`,
				);
			}
			taskDefinition.children = directlyCalledScripts;
		}
	}
}

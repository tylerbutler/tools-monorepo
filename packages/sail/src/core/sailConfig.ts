import type { BuildProjectConfig } from "@tylerbu/sail-infrastructure";
import type { TaskDefinitionsOnDisk } from "./taskDefinitions.js";

/**
 * Configuration for loading a Sail task handler plugin.
 *
 * @remarks
 * Plugins are self-contained modules that register their own task handlers,
 * eliminating the need for users to manually map executables to handlers.
 */
export type TaskHandlerPlugin = string | TaskHandlerPluginConfig;

/**
 * Detailed configuration for a task handler plugin.
 */
export interface TaskHandlerPluginConfig {
	/**
	 * The path to the plugin module.
	 * Can be:
	 * - A relative path starting with './' or '../' (e.g., './plugins/vite.js')
	 * - An absolute path
	 * - A package name (e.g., '@company/sail-vite-plugin')
	 */
	module: string;

	/**
	 * Optional export name to use from the module.
	 * If not provided, the default export will be used.
	 *
	 * @example
	 * ```typescript
	 * // Default export
	 * { module: '@company/sail-vite-plugin' }
	 *
	 * // Named export
	 * { module: './plugins.js', exportName: 'vitePlugin' }
	 * ```
	 */
	exportName?: string;
}

/**
 * The version of the Sail configuration currently used.
 *
 * @remarks
 *
 * This is not exported outside of the build-tools package; it is only used internally.
 */
export const CONFIG_VERSION = 1;

/**
 * Top-most configuration for repo build settings.
 */
export interface ISailConfig {
	/**
	 * The version of the config.
	 *
	 * IMPORTANT: this will become required in a future release.
	 */
	version: number;

	/**
	 * Build tasks and dependencies definitions
	 */
	tasks?: TaskDefinitionsOnDisk;

	/**
	 * Add task handlers based on configuration only. This allows you to add incremental build support for executables and
	 * commands that don't support it.
	 */
	declarativeTasks?: DeclarativeTasks;

	/**
	 * Plugins to load for custom task handlers.
	 *
	 * Plugins are self-contained modules that register task handlers for specific tools/executables.
	 * Users only need to specify the plugin module; the plugin itself declares which executables it supports.
	 *
	 * @example
	 * ```typescript
	 * {
	 *   plugins: [
	 *     '@company/sail-vite-plugin',  // Simple string
	 *     { module: './plugins/custom.js' },  // Local file
	 *     { module: './plugins.js', exportName: 'esbuildPlugin' }  // Named export
	 *   ]
	 * }
	 * ```
	 */
	plugins?: TaskHandlerPlugin[];

	/**
	 * An array of commands that are known to have subcommands and should be parsed as such.
	 *
	 * These values will be combined with the default values: ["flub", "biome"]
	 */
	multiCommandExecutables?: string[];

	/**
	 * The configuration for the build project can be included in the Sail config instead of separately.
	 */
	buildProject: BuildProjectConfig;
}

/**
 * Declarative tasks allow Sail to support incremental builds for tasks it doesn't natively identify. A
 * DeclarativeTask defines a set of input and output globs, and files matching those globs will be included in the
 * donefiles (the cached data we check to see if tasks need to be run) for the task.
 *
 * Note that by default, gitignored files are treated differently for input globs vs. output globs. This can be
 * changed using the `gitignore` property on the task. See the documentation for that property for details.
 */
export interface DeclarativeTask {
	/**
	 * An array of globs that will be used to identify input files for the task. The globs are interpreted relative to the
	 * package the task belongs to.
	 *
	 * By default, inputGlobs **will not** match files ignored by git. This can be changed using the `gitignore` property
	 * on the task. See the documentation for that property for details.
	 */
	inputGlobs: string[];

	/**
	 * An array of globs that will be used to identify output files for the task. The globs are interpreted relative to
	 * the package the task belongs to.
	 *
	 * By default, outputGlobs **will** match files ignored by git, because build output is often gitignored. This can be
	 *   changed using the `gitignore` property on the task. See the documentation for that property for details.
	 */
	outputGlobs: string[];

	/**
	 * Configures how gitignore rules are applied. "input" applies gitignore rules to the input, "output" applies them to
	 * the output, and including both values will apply the gitignore rules to both the input and output globs.
	 *
	 * The default value, `["input"]` applies gitignore rules to the input, but not the output. This is the right behavior
	 * for many tasks since most tasks use source-controlled files as input but generate gitignored build output. However,
	 * it can be adjusted on a per-task basis depending on the needs of the task.
	 *
	 * @defaultValue `["input"]`
	 */
	gitignore?: GitIgnoreSetting;
}

export type GitIgnoreSetting = ("input" | "output")[];

/**
 * Valid values that can be used in the `gitignore` array setting of a DeclarativeTask.
 */
export type GitIgnoreSettingValue = GitIgnoreSetting[number];

/**
 * The default gitignore setting for a DeclarativeTask.
 */
export const gitignoreDefaultValue: GitIgnoreSetting = ["input"];

/**
 * This mapping of executable/command name to DeclarativeTask is used to connect the task to the correct executable(s).
 * Note that multi-command executables must also be included in the multiCommandExecutables setting. If they are not,
 * the commands will not be parsed correctly and may not match the task as expected.
 */
export interface DeclarativeTasks {
	[executable: string]: DeclarativeTask;
}

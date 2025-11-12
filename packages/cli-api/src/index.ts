/**
 * Common infrastructure and APIs for building oclif-based command-line applications.
 *
 * @remarks
 * This package provides base classes, utilities, and helpers for creating robust CLI tools
 * using the oclif framework. It includes git integration, configuration management,
 * logging capabilities, and common patterns for CLI development.
 *
 * @packageDocumentation
 */

export { type Args, BaseCommand, type Flags } from "./baseCommand.js";
export * from "./capabilities/index.js";
export {
	CommandWithConfig,
	type CommandWithContext,
} from "./configCommand.js";
export {
	ConfigFileFlag,
	RegExpFlag,
} from "./flags.js";
export type { CommitMergeability } from "./git.js";
export {
	checkConflicts,
	findGitRoot,
	getMergeBase,
	Repository,
	revList,
	shortCommit,
} from "./git.js";
export {
	type CommandWithGit as RequiresGit,
	GitCommand,
} from "./gitCommand.js";
export {
	type JsonWriteOptions,
	type PackageTransformer,
	readJsonWithIndent,
	updatePackageJsonFile,
} from "./json.js";
export type {
	ErrorLoggingFunction,
	Logger,
	LoggingFunction,
} from "./logger.js";
export {
	detectAllPackageManagers,
	detectFromLockfilePath,
	detectPackageManager,
	getAllLockfiles,
	getPackageManagerInfo,
	PACKAGE_MANAGERS,
	type PackageManager,
	type PackageManagerInfo,
} from "./package-manager.js";

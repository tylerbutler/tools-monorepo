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

export { type Args, type Flags, BaseCommand } from "./baseCommand.js";
export {
	CommandWithConfig,
	type CommandWithContext,
} from "./configCommand.js";
export {
	RegExpFlag,
	ConfigFileFlag,
} from "./flags.js";
export type { CommitMergeability } from "./git.js";
export { findGitRoot } from "./git.js";
export {
	GitCommand,
	type CommandWithGit as RequiresGit,
} from "./gitCommand.js";
export {
	Repository,
	checkConflicts,
	getMergeBase,
	revList,
	shortCommit,
} from "./git.js";
export {
	readJsonWithIndent,
	updatePackageJsonFile,
	type JsonWriteOptions,
	type PackageTransformer,
} from "./json.js";
export type {
	ErrorLoggingFunction,
	LoggingFunction,
	Logger,
} from "./logger.js";

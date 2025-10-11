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

export { type Args, BaseCommand, type Flags } from "./baseCommand.ts";
export {
	CommandWithConfig,
	type CommandWithContext,
} from "./configCommand.ts";
export {
	ConfigFileFlag,
	RegExpFlag,
} from "./flags.ts";
export type { CommitMergeability } from "./git.ts";
export {
	checkConflicts,
	findGitRoot,
	getMergeBase,
	Repository,
	revList,
	shortCommit,
} from "./git.ts";
export {
	type CommandWithGit as RequiresGit,
	GitCommand,
} from "./gitCommand.ts";
export {
	type JsonWriteOptions,
	type PackageTransformer,
	readJsonWithIndent,
	updatePackageJsonFile,
} from "./json.ts";
export type {
	ErrorLoggingFunction,
	Logger,
	LoggingFunction,
} from "./logger.ts";

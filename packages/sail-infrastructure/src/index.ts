/**
 * This is the main entrypoint to the build-infrastructure API.
 *
 * The primary purpose of this package is to provide a common way to organize npm packages into groups called release
 * groups, and leverages workspaces functionality provided by package managers like npm, yarn, and pnpm to manage
 * interdependencies between packages across a BuildProject. It then provides APIs to select, filter, and work with
 * those package groups.
 *
 * @module default entrypoint
 */

export {
	BuildProject,
	generateBuildProjectConfig,
	getAllDependencies,
	loadBuildProject,
} from "./buildProject.js";
export {
	BUILDPROJECT_CONFIG_MIN_VERSION,
	type BuildProjectConfig,
	type BuildProjectConfigV1,
	type BuildProjectConfigV2,
	getBuildProjectConfig,
	type IFluidBuildDir,
	type IFluidBuildDirEntry,
	type IFluidBuildDirs,
	isV1Config,
	type ReleaseGroupDefinition,
	type WorkspaceDefinition,
} from "./config.js";
export { NotInGitRepository } from "./errors.js";
export type {
	AllPackagesSelectionCriteria,
	EmptySelectionCriteria,
	FilterablePackage,
	GlobString,
	PackageFilterOptions,
	PackageSelectionCriteria,
} from "./filter.js";
export {
	filterPackages,
	selectAndFilterPackages,
} from "./filter.js";
export {
	findGitRootSync,
	getChangedSinceRef,
	getFiles,
	getMergeBaseRemote,
	getRemote,
} from "./git.js";
export type {
	ErrorLoggingFunction,
	Logger,
	LoggingFunction,
} from "./logging.js";
export { PackageBase } from "./package.js";
export {
	updatePackageJsonFile,
	updatePackageJsonFileAsync,
} from "./packageJsonUtils.js";
export { detectPackageManager } from "./packageManagers.js";
export { Stopwatch } from "./stopwatch.js";
export type {
	AdditionalPackageProps,
	IBuildProject,
	Installable,
	IPackage,
	IPackageManager,
	IReleaseGroup,
	IWorkspace,
	PackageDependency,
	PackageJson,
	PackageManagerName,
	PackageName,
	PnpmPackageJsonFields,
	ReleaseGroupName,
	Reloadable,
	WorkspaceName,
} from "./types.js";
export { isIPackage, isIReleaseGroup } from "./types.js";
export { setVersion } from "./versions.js";

/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
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
export { BuildProject, generateBuildProjectConfig, getAllDependencies, loadBuildProject, } from "./buildProject.js";
export { BUILDPROJECT_CONFIG_MIN_VERSION, getBuildProjectConfig, isV1Config, } from "./config.js";
export { NotInGitRepository } from "./errors.js";
export { filterPackages, selectAndFilterPackages, } from "./filter.js";
export { getFiles, findGitRootSync, getMergeBaseRemote, getRemote, getChangedSinceRef, } from "./git.js";
export { PackageBase } from "./package.js";
export { updatePackageJsonFile, updatePackageJsonFileAsync } from "./packageJsonUtils.js";
export { detectPackageManager } from "./packageManagers.js";
export { Stopwatch } from "./stopwatch.js";
export { isIPackage, isIReleaseGroup } from "./types.js";
export { setVersion } from "./versions.js";
//# sourceMappingURL=index.js.map
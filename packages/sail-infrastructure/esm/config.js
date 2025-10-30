/*!
 * Copyright (c) Microsoft Corporation and contributors. All rights reserved.
 * Licensed under the MIT License.
 */
import { cosmiconfigSync } from "cosmiconfig";
import { isIPackage, } from "./types.js";
/**
 * The minimum version of the BuildProject configuration currently supported.
 */
export const BUILDPROJECT_CONFIG_MIN_VERSION = 1;
/**
 * Type guard to check if the input is a BuildProjectConfigV1.
 *
 * @param input - The input to check.
 * @returns `true` if the input is a BuildProjectConfigV1; `false` otherwise.
 */
export function isV1Config(input) {
    return input.version === 1;
}
/**
 * Type guard to check if the input is a BuildProjectConfigV2.
 *
 * @param input - The input to check.
 * @returns `true` if the input is a BuildProjectConfigV2; `false` otherwise.
 */
export function isV2Config(input) {
    return input.version === 2;
}
/**
 * Checks if a package matches a given {@link ReleaseGroupDefinition}.
 *
 * @returns `true` if the package matches the release group definition; `false` otherwise.
 */
export function matchesReleaseGroupDefinition(pkg, { include, exclude, rootPackageName }) {
    const name = isIPackage(pkg) ? pkg.name : pkg;
    let shouldInclude = false;
    if (
    // Special case: an include value with a single element, "*", should include all packages.
    (include.length === 1 && include[0] === "*") ||
        // If the package name matches an entry in the include list, it should be included
        include.includes(name) ||
        // If the package name starts with any of the include list entries, it should be included
        include.some((scope) => name.startsWith(scope))) {
        shouldInclude = true;
    }
    const shouldExclude = exclude?.includes(name) ?? false;
    return ((shouldInclude && !shouldExclude) ||
        // If the package name matches the root name, it's definitely part of the release group.
        name === rootPackageName);
}
/**
 * Finds the name of the release group that a package belongs to based on the release group configuration within a
 * workspace.
 *
 * @param pkg - The package for which to find a release group.
 * @param definition - The "releaseGroups" config from the RepoLayout configuration.
 * @returns The name of the package's release group.
 */
export function findReleaseGroupForPackage(pkg, definition) {
    for (const [rgName, def] of Object.entries(definition)) {
        if (matchesReleaseGroupDefinition(pkg, def)) {
            return rgName;
        }
    }
}
const configName = "buildProject";
/**
 * A cosmiconfig explorer to find the buildProject config. First looks for JavaScript config files and falls back to the
 * `buildProject` property in package.json. We create a single explorer here because cosmiconfig internally caches
 * configs for performance. The cache is per-explorer, so re-using the same explorer is a minor perf improvement.
 */
const configExplorer = cosmiconfigSync(configName, {
    searchPlaces: [
        `${configName}.config.cjs`,
        `${configName}.config.js`,
        // Load from the fluidBuild config files as a fallback.
        "fluidBuild.config.cjs",
        "fluidBuild.config.js",
        // Or the buildProject property in package.json
        "package.json",
    ],
    packageProp: [configName],
});
/**
 * Search a path for a build project config file, and return the parsed config and the path to the config file.
 *
 * @param searchPath - The path to start searching for config files in.
 * @param noCache - If true, the config cache will be cleared and the config will be reloaded.
 * @returns The loaded build project config and the path to the config file.
 *
 * @throws If a config is not found or if the config version is not supported.
 */
export function getBuildProjectConfig(searchPath, noCache = false) {
    if (noCache === true) {
        configExplorer.clearCaches();
    }
    const configResult = configExplorer.search(searchPath);
    if (configResult === null || configResult === undefined) {
        throw new Error("No BuildProject configuration found.");
    }
    const config = configResult.config;
    // Only versions higher than the minimum are supported. If any other value is provided, throw an error.
    if (config.version < BUILDPROJECT_CONFIG_MIN_VERSION) {
        throw new Error(`Configuration version is not supported: ${config?.version}. Config version must be >= ${BUILDPROJECT_CONFIG_MIN_VERSION}.`);
    }
    return { config, configFilePath: configResult.filepath };
}
//# sourceMappingURL=config.js.map
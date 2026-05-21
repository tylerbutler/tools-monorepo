import { TypeScriptLoader } from "@tylerbu/lilconfig-loader-ts";
import { lilconfigSync } from "lilconfig";
import type { RequireExactlyOne } from "type-fest";
import {
	type IPackage,
	isIPackage,
	type PackageName,
	type ReleaseGroupName,
} from "./types.js";

/**
 * The minimum version of the BuildProject configuration currently supported.
 */
export const BUILDPROJECT_CONFIG_MIN_VERSION = 2;

export type BuildProjectConfig = BuildProjectConfigV2;

/**
 * Top-most configuration for BuildProject settings.
 */
export interface BuildProjectConfigBase {
	/**
	 * The version of the config.
	 */
	version: number;

	/**
	 * The layout of the build project into workspaces and release groups.
	 */
	buildProject?: {
		workspaces: {
			/**
			 * A mapping of workspace name to folder containing a workspace config file (e.g. pnpm-workspace.yaml).
			 */
			[name: string]: WorkspaceDefinition;
		};
	};
}

interface BuildProjectConfigV2Base extends Partial<BuildProjectConfigBase> {
	/**
	 * The version of the config.
	 */
	version: 2;

	/**
	 * An array of glob strings. Any paths that match at least on of these globs will be excluded from the build project.
	 * This setting is helpful if you need to exclude workspaces that are used for testing or that are not yet managed by
	 * sail.
	 */
	excludeGlobs: string[];
}

export type BuildProjectConfigV2 = RequireExactlyOne<
	BuildProjectConfigV2Base,
	"excludeGlobs" | "buildProject"
>;

/**
 * Type guard to check if the input is a BuildProjectConfigV2.
 *
 * @param input - The input to check.
 * @returns `true` if the input is a BuildProjectConfigV2; `false` otherwise.
 */
export function isV2Config(
	input: BuildProjectConfig,
): input is BuildProjectConfigV2 {
	return input.version === 2;
}

/**
 * The definition of a workspace in configuration.
 */
export interface WorkspaceDefinition {
	/**
	 * The root directory of the workspace. This folder should contain a workspace config file (e.g. pnpm-workspace.yaml).
	 */
	directory: string;

	/**
	 * Definitions of the release groups within the workspace.
	 */
	releaseGroups: {
		/**
		 * A mapping of release group name to a definition for the release group.
		 */
		[name: string]: ReleaseGroupDefinition;
	};
}

/**
 * The definition of a release group ih configuration.
 */
export interface ReleaseGroupDefinition {
	/**
	 * An array of scopes or package names that should be included in the release group. Each package must
	 * belong to a single release group.
	 *
	 * To include all packages, set this value to a single element: `["*"]`.
	 */
	include: string[];

	/**
	 * An array of scopes or package names that should be excluded. Exclusions are applied AFTER inclusions, so
	 * this can be used to exclude specific packages in a certain scope.
	 */
	exclude?: string[];

	/**
	 * The name of the package that should be considered the root package for the release group. If not provided, the
	 * release group is considered "rootless."
	 *
	 * @remarks
	 *
	 * A release group may have a "root package" that is part of the workspace but fills a similar role to the
	 * workspace-root package: it is a convenient place to store release-group-wide scripts as opposed to workspace-wide
	 * scripts.
	 */
	rootPackageName?: string;

	/**
	 * A URL to the ADO CI pipeline that builds the release group.
	 */
	adoPipelineUrl?: string;
}

/**
 * Checks if a package matches a given {@link ReleaseGroupDefinition}.
 *
 * @returns `true` if the package matches the release group definition; `false` otherwise.
 */
export function matchesReleaseGroupDefinition(
	pkg: IPackage | PackageName,
	{ include, exclude, rootPackageName }: ReleaseGroupDefinition,
): boolean {
	const name = isIPackage(pkg) ? pkg.name : pkg;
	let shouldInclude = false;

	if (
		// Special case: an include value with a single element, "*", should include all packages.
		(include.length === 1 && include[0] === "*") ||
		// If the package name matches an entry in the include list, it should be included
		include.includes(name) ||
		// If the package name starts with any of the include list entries, it should be included
		include.some((scope) => name.startsWith(scope))
	) {
		shouldInclude = true;
	}

	const shouldExclude = exclude?.includes(name) ?? false;
	return (
		(shouldInclude && !shouldExclude) ||
		// If the package name matches the root name, it's definitely part of the release group.
		name === rootPackageName
	);
}

/**
 * Finds the name of the release group that a package belongs to based on the release group configuration within a
 * workspace.
 *
 * @param pkg - The package for which to find a release group.
 * @param definition - The "releaseGroups" config from the RepoLayout configuration.
 * @returns The name of the package's release group.
 */
export function findReleaseGroupForPackage(
	pkg: IPackage | PackageName,
	definition: Exclude<WorkspaceDefinition["releaseGroups"], undefined>,
): ReleaseGroupName | undefined {
	for (const [rgName, def] of Object.entries(definition)) {
		if (matchesReleaseGroupDefinition(pkg, def)) {
			return rgName as ReleaseGroupName;
		}
	}
}

const configName = "buildProject";

/**
 * A lilconfig explorer to find the buildProject config. First looks for JavaScript config files and falls back to the
 * `buildProject` property in package.json. We create a single explorer here because lilconfig internally caches
 * configs for performance. The cache is per-explorer, so re-using the same explorer is a minor perf improvement.
 */
const configExplorer = lilconfigSync(configName, {
	searchPlaces: [
		`${configName}.config.cjs`,
		`${configName}.config.js`,

		// Load from the fluidBuild config files as a fallback.
		"fluidBuild.config.cjs",
		"fluidBuild.config.js",

		// Or the buildProject property in package.json
		"package.json",
	],
	loaders: {
		".ts": TypeScriptLoader,
		".cts": TypeScriptLoader,
		".mts": TypeScriptLoader,
	},
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
export function getBuildProjectConfig(
	searchPath: string,
	noCache = false,
): { config: BuildProjectConfig; configFilePath: string } {
	if (noCache === true) {
		configExplorer.clearCaches();
	}

	const configResult = configExplorer.search(searchPath);
	if (configResult === null || configResult === undefined) {
		throw new Error("No BuildProject configuration found.");
	}
	const config = configResult.config as BuildProjectConfig;

	// Only versions higher than the minimum are supported. If any other value is provided, throw an error.
	if (config.version < BUILDPROJECT_CONFIG_MIN_VERSION) {
		throw new Error(
			`Configuration version is not supported: ${config?.version}. Config version must be >= ${BUILDPROJECT_CONFIG_MIN_VERSION}.`,
		);
	}

	return { config, configFilePath: configResult.filepath };
}

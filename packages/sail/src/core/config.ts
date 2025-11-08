import type { Logger } from "@tylerbu/cli-api";
import { TypeScriptLoader } from "@tylerbu/lilconfig-loader-ts";
import { generateBuildProjectConfig } from "@tylerbu/sail-infrastructure";
import { lilconfigSync } from "lilconfig";
import { CONFIG_VERSION, type ISailConfig } from "./sailConfig.js";

const configName = "sail";

/**
 * A lilconfig explorer to find the sail config. First looks for JavaScript config files and falls back to the
 * `sail` property in package.json. We create a single explorer here because lilconfig internally caches configs
 * for performance. The cache is per-explorer, so re-using the same explorer is a minor perf improvement.
 */
const configExplorer = lilconfigSync(configName, {
	searchPlaces: [`${configName}.config.cjs`, "fluidBuild.config.cjs"],
	loaders: {
		".ts": TypeScriptLoader,
		".cts": TypeScriptLoader,
		".mts": TypeScriptLoader,
	},
});

/**
 * Get an ISailConfig from the "sail" property in a package.json file, or from sail.config.[c]js.
 *
 * @param rootDir - The path to the root package.json to load.
 * @param noCache - If true, the config cache will be cleared and the config will be reloaded.
 * @returns The sail section of the package.json, or undefined if not found
 *
 * @beta
 */
export function getSailConfig(
	rootDir: string,
	noCache = false,
	log?: Logger,
): { config: ISailConfig; configFilePath: string } {
	if (noCache === true) {
		configExplorer.clearCaches();
	}

	const configResult = configExplorer.search(rootDir);
	const config = configResult?.config as ISailConfig | undefined;

	if (config === undefined || configResult === null) {
		throw new Error("No sail configuration found.");
	}

	if (config.version === undefined) {
		log?.warning(
			"sail config has no version field. This field will be required in a future release.",
		);
		config.version = CONFIG_VERSION;
	}

	// Only version 1 of the config is supported. If any other value is provided, throw an error.
	if (config.version !== CONFIG_VERSION) {
		throw new Error(
			`Configuration version is not supported: ${config?.version}. Config version must be ${CONFIG_VERSION}.`,
		);
	}

	config.buildProject ??= generateBuildProjectConfig(rootDir);

	return { config, configFilePath: configResult.filepath };
}

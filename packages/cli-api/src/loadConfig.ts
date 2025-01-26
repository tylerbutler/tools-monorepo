import { stat } from "node:fs/promises";
import { createJiti } from "jiti";
import {
	type LilconfigResult,
	type Loader,
	type LoaderResult,
	type Options,
	lilconfig,
} from "lilconfig";

/**
 * A jiti instance to import modules.
 */
const jiti = createJiti(import.meta.url);

/**
 * A barebones TypeScript module importer. It imports and returns the default export from the TypeScript file at
 * filepath.
 * 
 * @param filepath - The path to a TypeScript file to load.
 * @throws If the file cannot be found or imported.
= */
const tsLoader: Loader = async (filepath: string): Promise<LoaderResult> => {
	// If the file doesn't exist, this will throw an error.
	const modDefault = await jiti.import(filepath, { default: true });
	return modDefault;
};

/**
 * Loads a config of the given type from the file system.
 *
 * Config file names to be of the form ${moduleName}.config.(cjs/mjs/ts).
 *
 * @typeParam C - The type of the loaded config.
 * @param moduleName - A string for the module/app whose config is being loaded.
 * @param searchPath - The path to start searching for a config. If this is a path to a file that matches a config file,
 * it will be loaded.
 * @param stopDir - An optional directory to stop recursing up to find a config.
 * @param defaultConfig - An optional default config that will be used if no config is loaded.
 * @returns An object containing the `config` and its location (file path), if any is loaded. Returns `undefined` if no
 * config file is found.
 */
export async function loadConfig<C>(
	moduleName: string,
	searchPath: string,
	stopDir?: string,
): Promise<{ config: C; location: string } | undefined> {
	const options: Options = {
		searchPlaces: [
			`${moduleName}.config.ts`,
			`${moduleName}.config.mjs`,
			`${moduleName}.config.cjs`,
		],
		loaders: {
			".ts": tsLoader,
		},
	};

	if (stopDir !== undefined) {
		options.stopDir = stopDir;
	}

	const configLoader = lilconfig(moduleName, options);

	const pathStats = await stat(searchPath);
	const maybeConfig: LilconfigResult = pathStats.isDirectory()
		? await configLoader.search(searchPath)
		: await configLoader.load(searchPath);

	return maybeConfig === null
		? undefined
		: {
				config: maybeConfig.config,
				location: maybeConfig.filepath,
			};
}

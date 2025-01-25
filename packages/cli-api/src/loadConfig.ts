import { stat } from "node:fs/promises";
import { createJiti } from "jiti";
import {
	type LilconfigResult,
	type Loader,
	type LoaderResult,
	type Options,
	lilconfig,
} from "lilconfig";

// barebones ts-loader
const jiti = createJiti(import.meta.url);
const tsLoader: Loader = async (
	filepath: string,
	_content: string,
): Promise<LoaderResult> => {
	const modDefault = await jiti.import(filepath, { default: true });
	return modDefault;
};

export async function loadConfig<C>(
	moduleName: string,
	searchPath: string,
	stopDir?: string,
	defaultConfig?: C,
): Promise<{ config: C; filepath: string } | undefined> {
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

	return {
		config: maybeConfig?.config ?? defaultConfig,
		filepath: maybeConfig?.filepath ?? "",
	};
}

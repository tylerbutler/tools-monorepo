import { createJiti } from "jiti";
import type { Loader, LoaderResult } from "lilconfig";

/**
 * A jiti instance to import modules.
 */
const jiti = createJiti(import.meta.url);

/**
 * A barebones TypeScript module importer. It imports and returns the default export from the TypeScript file at
 * filepath.
 * 
 * @param filepath - The path to a TypeScript file to load.
 * @param _contents - The contents of the config file. **This property is unused. TypeScript modules are always loaded
 * from the file system.**
 * @throws If the file cannot be found or imported.
= */
export const TypeScriptLoader: Loader = async (
	filepath: string,
	_contents: string,
): Promise<LoaderResult> => {
	// If the file doesn't exist, this will throw an error.
	const modDefault = await jiti.import(filepath, { default: true });
	return modDefault;
};

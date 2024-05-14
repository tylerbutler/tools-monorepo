import { Args } from "@oclif/core";
import { globby } from "globby";

/**
 * Options that can be used to customize a GlobArg.
 *
 * @beta
 */
export type GlobArgOptions = {
	cwd?: string;
	absolute?: boolean;
};

/**
 * A custom arg that parses the input string as a glob.
 *
 * @beta
 */
export const GlobArg = Args.custom<string[], GlobArgOptions>({
	parse: async (input, _context, options) => {
		const paths = await globby([input], {
			cwd: options.cwd ?? process.cwd(),
			absolute: options.absolute ?? false,
		});
		return paths;
	},
});

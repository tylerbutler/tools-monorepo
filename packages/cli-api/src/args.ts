import process from "node:process";
import { Args } from "@oclif/core";
import { glob, type GlobOptions } from "tinyglobby";

/**
 * Options that can be used to customize a GlobArg.
 *
 * @beta
 */
export type GlobArgOptions = Omit<GlobOptions, "patterns">;

/**
 * A custom arg that parses the input string as a glob.
 *
 * @beta
 */
export const GlobArg = Args.custom<string[], GlobArgOptions>({
	parse: async (input, _context, options) => {
		const paths = await glob([input], options);
		return paths;
	},
});

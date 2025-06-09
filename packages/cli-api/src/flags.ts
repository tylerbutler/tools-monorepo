import { Flags } from "@oclif/core";

// export const regexFlag = Flags.custom<

/**
 * A custom oclif flag that parses string input into a RegExp object.
 * The resulting regex is case-insensitive by default.
 *
 * @example
 * ```typescript
 * static flags = {
 *   pattern: RegExpFlag({
 *     description: "Pattern to match files"
 *   })
 * }
 * ```
 *
 * @beta
 */
export const RegExpFlag = Flags.custom<RegExp>({
	// biome-ignore lint/suspicious/useAwait: inherited method
	parse: async (input) => {
		const policyRegex: RegExp = new RegExp(input, "i");
		return policyRegex;
	},
});

/**
 * A pre-configured oclif flag for configuration file paths.
 * Validates that the file exists and displays in the CONFIGURATION help group.
 *
 * @beta
 */
export const ConfigFileFlag = Flags.file({
	description: "The path to a configuration file.",
	helpGroup: "CONFIGURATION",
	exists: true,
});

/**
 * A pre-configured oclif flag for configuration file paths that is hidden from help output.
 * Validates that the file exists and displays in the CONFIGURATION help group.
 *
 * @beta
 */
export const ConfigFileFlagHidden = Flags.file({
	description: "The path to a configuration file.",
	helpGroup: "CONFIGURATION",
	exists: true,
	hidden: true,
});

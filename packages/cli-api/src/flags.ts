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
	parse: async (input) => {
		const policyRegex: RegExp = new RegExp(input, "i");
		return policyRegex;
	},
});

/**
 * A pre-configured oclif flag for configuration file paths.
 * Includes `-c` shorthand, validates that the file exists, and displays in the CONFIGURATION help group.
 *
 * @example
 * ```typescript
 * import { ConfigFlag } from "@tylerbu/cli-api";
 *
 * class MyCommand extends BaseCommand {
 *   static flags = {
 *     config: ConfigFlag,  // Adds -c, --config <path> with file validation
 *   };
 * }
 * ```
 *
 * @beta
 */
export const ConfigFlag = Flags.file({
	char: "c",
	description: "Path to configuration file.",
	helpGroup: "CONFIGURATION",
	exists: true,
});

/**
 * A pre-configured oclif flag for configuration file paths that is hidden from help output.
 * Validates that the file exists.
 *
 * @beta
 */
export const ConfigFlagHidden = Flags.file({
	char: "c",
	description: "Path to configuration file.",
	helpGroup: "CONFIGURATION",
	exists: true,
	hidden: true,
});

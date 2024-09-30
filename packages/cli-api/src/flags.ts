import { Flags } from "@oclif/core";

// export const regexFlag = Flags.custom<

/**
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
 * @beta
 */
export const ConfigFileFlag = Flags.file({
	description: "The path to a configuration file.",
	helpGroup: "CONFIGURATION",
	exists: true,
});

/**
 * @beta
 */
export const ConfigFileFlagHidden = Flags.file({
	description: "The path to a configuration file.",
	helpGroup: "CONFIGURATION",
	exists: true,
	hidden: true,
});

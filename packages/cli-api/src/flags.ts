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

import { stat } from "node:fs/promises";
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
export type ConfigFlagConfig = {
	exists?: boolean;
};

/**
 * @beta
 */
export const ConfigFileFlag = Flags.custom<string, ConfigFlagConfig>({
	description: "The path to a configuration file.",
	parse: async (input, _, options): Promise<string | undefined> => {
		if (options.exists === true) {
			const statResults = await stat(input);
			if (!statResults.isFile()) {
				throw new Error(`Config file doesn't exist: ${input}`);
			}
		}
		return undefined;
	},
});

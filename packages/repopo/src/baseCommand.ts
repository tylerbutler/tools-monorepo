import { CommandWithConfig } from "@tylerbu/cli-api";
import type { PolicyConfig } from "./config.js";

/**
 * This command lists all the policies configured to run.
 */
export abstract class BaseRepopoCommand extends CommandWithConfig<
	typeof BaseRepopoCommand & {
		args: typeof CommandWithConfig.args;
		flags: typeof CommandWithConfig.flags;
	},
	PolicyConfig
> {
	// public override async loadConfig(): Promise<PolicyConfig> {
	// 	const config = await super.loadConfig();
	// 	if (config === undefined) {
	// 		this.error("Failed to load config.", { exit: 1 });
	// 	}
	// 	return config;
	// }
}

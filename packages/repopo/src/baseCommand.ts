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
> {}

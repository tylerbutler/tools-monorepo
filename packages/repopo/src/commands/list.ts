import { CommandWithConfig } from "@tylerbu/cli-api";
import type { PolicyConfig } from "../config.js";

/**
 * This tool enforces policies across the code base via a series of handler functions. The handler functions are
 * associated with a regular expression, and all files matching that expression are passed to the handler function.
 *
 * By default, the list of files to check comes from `git ls-files. You can also pipe in file names from stdin. For
 * example:
 *
 * `git ls-files -co --exclude-standard --full-name | repopo check --stdin --verbose`
 */
export class ListCommand extends CommandWithConfig<
	typeof ListCommand & {
		args: typeof CommandWithConfig.args;
		flags: typeof CommandWithConfig.flags;
	},
	PolicyConfig
> {
	static override readonly summary =
		"Checks and applies policies to the files in the repository.";

	// biome-ignore lint/suspicious/useAwait: inherited method
	public override async run(): Promise<void> {
		const policies = this.commandConfig?.policies ?? [];
		// list the handlers then exit
		for (const h of policies) {
			this.log(`${h.name}\nresolver: ${h.resolver !== undefined}\n`);
		}
		this.log(`${policies.length} TOTAL POLICY HANDLERS`);
	}
}

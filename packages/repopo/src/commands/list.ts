import chalk from "chalk";

import { BaseRepopoCommand } from "../baseCommand.js";

/**
 * This command lists all the policies configured to run.
 */
export class ListCommand<
	T extends typeof BaseRepopoCommand & {
		args: typeof ListCommand.args;
		flags: typeof ListCommand.flags;
	},
> extends BaseRepopoCommand<T> {
	static override readonly summary = "Lists the policies configured to run.";

	// biome-ignore lint/suspicious/useAwait: inherited method
	public override async run(): Promise<void> {
		const { policies } = this.getContext();

		// list the handlers then exit
		this.log(`${policies.length} TOTAL POLICY HANDLERS`);
		for (const h of policies) {
			this.log(`${chalk.bold(h.name)} (auto-fix: ${h.resolver !== undefined})`);
		}
	}
}

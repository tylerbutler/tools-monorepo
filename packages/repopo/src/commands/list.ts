import chalk from "picocolors";

import { BaseRepopoCommand } from "../baseCommand.js";
import type { RepoPolicy } from "../policy.js";

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
	public override async run(): Promise<RepoPolicy[]> {
		const { policies } = this.getContext();

		// list the handlers then exit
		this.log(`${policies.length} POLICIES ENABLED`);
		for (const h of policies) {
			this.log(`${chalk.bold(h.name)} (auto-fix: ${h.resolver !== undefined})`);
		}
		return policies;
	}
}

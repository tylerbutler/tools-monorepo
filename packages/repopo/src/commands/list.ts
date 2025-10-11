import { BaseRepopoCommand } from "../baseCommand.ts";
import { DefaultPolicies } from "../policy.ts";

/**
 * This command lists all the policies configured to run.
 */
export class ListCommand<
	T extends typeof BaseRepopoCommand & {
		args: typeof ListCommand.args;
		flags: typeof ListCommand.flags;
	},
> extends BaseRepopoCommand<T> {
	public static override readonly summary =
		"Lists the policies configured to run.";

	public override async run(): Promise<void> {
		const policies = this.commandConfig?.policies ?? DefaultPolicies;
		// list the handlers then exit
		for (const h of policies) {
			this.log(`${h.name}\nresolver: ${h.resolver !== undefined}\n`);
		}
		this.log(`${policies.length} TOTAL POLICY HANDLERS`);
	}
}

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
	public static override readonly summary =
		"Lists the policies configured to run.";

	public override async run(): Promise<void> {
		const { policies } = await this.getContext();
		// list the handlers then exit
		for (const configuredPolicy of policies) {
			this.log(configuredPolicy.instanceId);
			this.log(`  ${configuredPolicy.description}`);
			this.log(`  resolver: ${configuredPolicy.resolver !== undefined}\n`);
		}
		this.log(`${policies.length} TOTAL POLICY HANDLERS`);
	}
}

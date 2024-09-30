import { BaseRepopoCommand } from "../baseCommand.js";

/**
 * This command lists all the policies configured to run.
 */
export class ListCommand extends BaseRepopoCommand {
	static override readonly summary = "Lists the policies configured to run.";

	public override async run(): Promise<void> {
		const config = await this.loadConfig();
		if (config === undefined) {
			this.error("Failed to load config.", { exit: 1 });
		}

		const policies = config.policies ?? [];
		// list the handlers then exit
		for (const h of policies) {
			this.log(`${h.name}\nresolver: ${h.resolver !== undefined}\n`);
		}
		this.log(`${policies.length} TOTAL POLICY HANDLERS`);
	}
}

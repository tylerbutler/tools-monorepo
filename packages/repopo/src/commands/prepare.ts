import { CommandWithConfig } from "@tylerbu/cli-api";
import { nativeFlags, runNative } from "../native.js";

export class Prepare extends CommandWithConfig<typeof Prepare, never> {
	protected override requiresConfig = false;

	public static override readonly summary =
		"Prepares native policy execution without running config or policies.";

	public static override readonly description =
		"Compiles and validates executable policy code in the Git-private per-worktree cache. " +
		"Reports QuickJS eligibility or the reason IPC is required. " +
		"Requires Node or Bun on a cache miss. A valid cached artifact is reused. " +
		"Does not evaluate the config, run handlers, or apply fixes.";

	public static override readonly flags = nativeFlags;

	public override async run(): Promise<void> {
		const { flags } = await this.parse(Prepare);
		const args: string[] = [];
		if (flags.config) {
			args.push("--config", flags.config);
		}
		if (flags.runtime) {
			args.push("--runtime", flags.runtime);
		}
		if (flags.verbose) {
			args.push("--verbose");
		}
		if (flags.quiet) {
			args.push("--quiet");
		}
		await runNative(
			"prepare",
			args,
			flags["binary-path"],
			flags["sidecar-path"],
		);
	}
}

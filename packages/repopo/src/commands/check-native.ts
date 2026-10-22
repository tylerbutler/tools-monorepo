import { Flags } from "@oclif/core";
import { CommandWithConfig } from "@tylerbu/cli-api";
import { DEFAULT_CONCURRENCY, validateConcurrency } from "../concurrency.js";
import { nativeFlags, runNative } from "../native.js";

export class CheckNative extends CommandWithConfig<typeof CheckNative, never> {
	protected override requiresConfig = false;

	public static override readonly summary =
		"Checks and applies policies using the Rust engine.";

	public static override readonly description =
		"Uses cached policy code in QuickJS when supported. In auto mode, unsupported " +
		"capabilities select IPC for the whole run before config or policies execute. " +
		"Use --mode quickjs to require QuickJS, or --mode ipc to bypass preparation. " +
		"Repository policies always use the full Git inventory, including with --stdin. " +
		"With --fix, repository policies can modify files outside the stdin selection.";

	public static override readonly flags = {
		...nativeFlags,
		concurrency: Flags.integer({
			description:
				"Maximum concurrent files in read-only checks. Fixes remain sequential.",
			default: DEFAULT_CONCURRENCY,
			parse: async (value) => validateConcurrency(Number(value)),
		}),
		fix: Flags.boolean({
			aliases: ["resolve"],
			description: "Fix errors if possible.",
			char: "f",
		}),
		stdin: Flags.boolean({
			description: "Read list of files from stdin.",
		}),
		mode: Flags.string({
			description:
				"Backend selection: automatic, strict QuickJS, or forced IPC.",
			options: ["auto", "quickjs", "ipc"],
			default: "auto",
		}),
	} as const;

	public override async run(): Promise<void> {
		const { flags } = await this.parse(CheckNative);
		const args = [
			"--concurrency",
			String(flags.concurrency),
			"--mode",
			flags.mode,
		];
		if (flags.fix) {
			args.push("--fix");
		}
		if (flags.stdin) {
			args.push("--stdin");
		}
		if (flags.verbose) {
			args.push("--verbose");
		}
		if (flags.quiet) {
			args.push("--quiet");
		}
		if (flags.config) {
			args.push("--config", flags.config);
		}
		if (flags.runtime) {
			args.push("--runtime", flags.runtime);
		}
		await runNative("check", args, flags["binary-path"], flags["sidecar-path"]);
	}
}

import { Flags } from "@oclif/core";
import { BaseCommand } from "../baseCommand.js";

/**
 * A test command that exercises the logging capabilities of BaseCommand.
 * Used for testing the pluggable logger architecture.
 *
 * @internal
 */
export default class LoggingTestCommand extends BaseCommand<
	typeof LoggingTestCommand
> {
	public static override readonly description =
		"Test command for logging functionality";

	public static override strict = true;

	public static override readonly flags = {
		...BaseCommand.baseFlags,
		method: Flags.string({
			description: "Which logging method to call",
			options: [
				"log",
				"success",
				"info",
				"warning",
				"error",
				"verbose",
				"exit",
				"exitWithCode",
				"logError",
				"warningWithDebugTrace",
				"all",
			],
			default: "log",
		}),
		message: Flags.string({
			description: "Message to log",
			default: "test message",
		}),
		"use-error": Flags.boolean({
			description: "Pass an Error object instead of a string",
			default: false,
		}),
		"exit-code": Flags.integer({
			description: "Exit code for exit method",
			default: 1,
		}),
	};

	public override async run(): Promise<void> {
		const { flags } = this;
		const message = flags["use-error"]
			? new Error(flags.message)
			: flags.message;

		switch (flags.method) {
			case "log": {
				this.log(flags.message);
				break;
			}
			case "success": {
				this.success(flags.message);
				break;
			}
			case "info": {
				this.info(message);
				break;
			}
			case "warning": {
				this.warning(message);
				break;
			}
			case "error": {
				this.logError(message);
				break;
			}
			case "verbose": {
				this.verbose(message);
				break;
			}
			case "logError": {
				this.logError(message);
				break;
			}
			case "warningWithDebugTrace": {
				this.warningWithDebugTrace(message);
				break;
			}
			case "exit": {
				this.exit(flags.message, flags["exit-code"]);
				break;
			}
			case "exitWithCode": {
				this.exit(flags["exit-code"]);
				break;
			}
			case "all": {
				this.log(flags.message);
				this.success(flags.message);
				this.info(message);
				this.warning(message);
				this.logError(message);
				this.verbose(message);
				break;
			}
		}
	}
}

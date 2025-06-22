import process from "node:process";
import { Command, type Interfaces, Flags as OclifFlags } from "@oclif/core";
import type { PrettyPrintableError } from "@oclif/core/errors";
import registerDebug, { type Debugger } from "debug";
import chalk from "picocolors";
import type { Logger } from "./logger.js";

/**
 * A type representing all the args of the base commands and subclasses.
 *
 * @public
 */
export type Args<T extends typeof Command> = Interfaces.InferredArgs<T["args"]>;

/**
 * A type representing all the flags of the base commands and subclasses.
 *
 * @public
 */
export type Flags<T extends typeof Command> = Interfaces.InferredFlags<
	(typeof BaseCommand)["baseFlags"] & T["flags"]
>;

/**
 * A base class for oclif commands that includes console and debug logging capabilities that are controlled by flags
 * and properties that can be overridden by subclasses.
 *
 * @public
 */
export abstract class BaseCommand<T extends typeof Command>
	extends Command
	implements Logger
{
	/**
	 * The flags defined on the base class.
	 */
	public static override baseFlags = {
		verbose: OclifFlags.boolean({
			char: "v",
			description: "Enable verbose logging.",
			helpGroup: "LOGGING",
			exclusive: ["quiet"],
			required: false,
			default: false,
		}),
		quiet: OclifFlags.boolean({
			description: "Disable all logging.",
			helpGroup: "LOGGING",
			exclusive: ["verbose"],
			required: false,
			default: false,
		}),
	};

	protected flags!: Flags<T>;
	protected args!: Args<T>;

	/**
	 * If true, all logs except those sent using the .log function will be suppressed.
	 */
	private suppressLogging = false;

	protected trace: Debugger | undefined;
	private traceLog: Debugger | undefined;
	private traceVerbose: Debugger | undefined;
	private traceInfo: Debugger | undefined;
	private traceWarning: Debugger | undefined;

	/**
	 * If true, log statements will be redirected to debug traces.
	 */
	protected redirectLogToTrace = false;

	/**
	 * If true, the command's `git` and `repo` properties will be populated. If the command is used outside a git
	 * repository, it will fail with an error.
	 */
	// protected get useGit(): boolean {
	// 	return false;
	// }

	public override async init(): Promise<void> {
		await super.init();

		const namespace = [this.config.bin, "cmd", this.id].join(":");

		this.trace = registerDebug(namespace);
		this.traceLog = registerDebug(
			[this.config.bin, "logging", "log"].join(":"),
		);
		this.traceVerbose = registerDebug(
			[this.config.bin, "logging", "verbose"].join(":"),
		);
		this.traceInfo = registerDebug(
			[this.config.bin, "logging", "info"].join(":"),
		);
		this.traceWarning = registerDebug(
			[this.config.bin, "logging", "warning"].join(":"),
		);

		const { args, flags } = await this.parse({
			flags: this.ctor.flags,
			baseFlags: (super.ctor as typeof BaseCommand).baseFlags,
			args: this.ctor.args,
			strict: this.ctor.strict,
		});
		this.flags = flags as Flags<T>;
		this.args = args as Args<T>;

		this.suppressLogging = this.flags.quiet;
	}

	/**
	 * Outputs a horizontal rule.
	 */
	public logHr() {
		this.log("=".repeat(Math.max(10, process.stdout.columns)));
	}

	/**
	 * Logs a message with an indent.
	 */
	public logIndent(input: string, indentNumber = 2) {
		const message = indentString(input, indentNumber);
		this.log(message);
	}

	/**
	 * Logs an informational message.
	 */
	public info(message: string | Error | undefined) {
		const msg =
			typeof message === "string"
				? message
				: [message?.message, message?.stack].join("\n");

		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this.log(`INFO: ${msg}`);
		}
		if (this.redirectLogToTrace) {
			this.traceInfo?.(msg);
		}
	}

	/**
	 * Logs an error without exiting.
	 */
	public errorLog(message: string | Error | undefined) {
		if (!this.suppressLogging) {
			const msg =
				typeof message === "string"
					? message
					: [message?.message, message?.stack].join("\n");
			this.log(chalk.red(`ERROR: ${msg}`));
		}
	}

	/**
	 * Logs a warning.
	 */
	public warning(message: string | Error | undefined): void {
		const msg =
			typeof message === "string"
				? message
				: [message?.message, message?.stack].join("\n");

		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this.log(chalk.yellow(`WARNING: ${msg}`));
		}
		if (this.redirectLogToTrace) {
			this.traceWarning?.(msg);
		}
	}

	/**
	 * Logs a warning with a stack trace in debug mode.
	 */
	public warningWithDebugTrace(message: string | Error): string | Error {
		if (this.suppressLogging && !this.redirectLogToTrace) {
			return "";
		}
		if (this.redirectLogToTrace) {
			this.traceWarning?.(message);
		}
		return super.warn(message);
	}

	/**
	 * Don't use this method; use warning instead.
	 *
	 * @deprecated Use {@link BaseCommand.warning} or {@link BaseCommand.warningWithDebugTrace} instead.
	 */
	public override warn(_input: string | Error): string | Error {
		throw new Error(`Don't use the warn method; it is deprecated.`);
	}

	/**
	 * Logs an error and exits the process. If you don't want to exit the process use {@link BaseCommand.errorLog}
	 * instead.
	 *
	 * @param input - an Error or a error message string,
	 * @param options - options for the error handler.
	 *
	 * @remarks
	 *
	 * This method overrides the oclif Command error method so we can do some formatting on the strings.
	 */
	public override error(
		input: string | Error,
		options: { code?: string | undefined; exit: false } & PrettyPrintableError,
	): void;

	/**
	 * Logs an error and exits the process. If you don't want to exit the process use {@link BaseCommand.errorLog}
	 * instead.
	 *
	 * @param input - an Error or a error message string,
	 * @param options - options for the error handler.
	 *
	 * @remarks
	 *
	 * This method overrides the oclif Command error method so we can do some formatting on the strings.
	 */
	public override error(
		input: string | Error,
		options?:
			| ({
					code?: string | undefined;
					exit?: number | undefined;
			  } & PrettyPrintableError)
			| undefined,
	): never;

	/**
	 * Logs an error and exits the process. If you don't want to exit the process use {@link BaseCommand.errorLog}
	 * instead.
	 *
	 * @param input - an Error or a error message string,
	 * @param options - options for the error handler.
	 *
	 * @remarks
	 *
	 * This method overrides the oclif Command error method so we can do some formatting on the strings.
	 */
	public override error(input: unknown, options?: unknown): void {
		if (!this.suppressLogging) {
			if (typeof input === "string") {
				super.error(chalk.red(input), options as never);
			}

			super.error(input as Error, options as never);
		}
	}

	/**
	 * Logs a verbose log statement.
	 */
	public verbose(message: string | Error | undefined): void {
		if (this.flags.verbose || this.redirectLogToTrace) {
			const msg =
				typeof message === "string"
					? message
					: [message?.message, message?.stack].join("\n");

			if (this.redirectLogToTrace) {
				this.traceVerbose?.(msg);
			} else {
				const color = typeof message === "string" ? chalk.gray : chalk.red;
				this.log(color(`VERBOSE: ${msg}`));
			}
		}
	}

	// public trace(message: string | Error | undefined): void {

	// }
}

/**
 * Indent text by prepending spaces.
 */
function indentString(str: string, indentNumber = 2): string {
	return `${" ".repeat(indentNumber)}${str}`;
}

import { Command, type Interfaces, Flags as OclifFlags } from "@oclif/core";
import type { PrettyPrintableError } from "@oclif/core/errors";
import registerDebug, { type Debugger } from "debug";
import type { Logger } from "./logger.js";
import { BasicLogger } from "./loggers/basic.js";

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

	/**
	 * A Logger instance that the command will use for logging. The class methods like log and warning are redirected to
	 * the functions in this logger.
	 */
	protected logger: Logger = BasicLogger;

	protected trace: Debugger | undefined;
	// biome-ignore lint/correctness/noUnusedPrivateClassMembers: used for future logging enhancement
	private traceLog: Debugger | undefined;
	private traceVerbose: Debugger | undefined;
	private traceInfo: Debugger | undefined;
	private traceWarning: Debugger | undefined;

	/**
	 * If true, log statements will be redirected to debug traces.
	 */
	protected redirectLogToTrace = false;

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
	 * Logs a message to the console.
	 */
	public override log(message?: string, ...args: unknown[]): void {
		this.logger.log(message ?? "", ...args);
	}

	/**
	 * Logs a success message.
	 */
	public success(message?: string) {
		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this.logger.success(message ?? "");
		}
		if (this.redirectLogToTrace) {
			this.traceInfo?.(message);
		}
	}

	/**
	 * Logs an informational message.
	 */
	public info(message: string | Error) {
		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this.logger.info(message);
		}
		if (this.redirectLogToTrace) {
			this.traceInfo?.(message);
		}
	}

	/**
	 * Logs an error without exiting.
	 */
	public errorLog(message: string | Error) {
		if (!this.suppressLogging) {
			this.logger.errorLog(message);
		}
	}

	/**
	 * Logs a warning.
	 */
	public warning(message: string | Error): void {
		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this.logger.warning(message);
		}
		if (this.redirectLogToTrace) {
			this.traceWarning?.(message);
		}
	}

	/**
	 * Logs a warning with a stack trace in debug mode.
	 */
	public warningWithDebugTrace(message: string | Error): void {
		if (this.suppressLogging && !this.redirectLogToTrace) {
			return;
		}
		if (this.redirectLogToTrace) {
			this.traceWarning?.(message);
		}
		this.logger.warning(message);
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
			this.logger.errorLog(input as Error | string);
			if (typeof input === "string") {
				super.error(input, options as never);
			}

			super.error(input as Error, options as never);
		}
	}

	/**
	 * Logs a verbose log statement.
	 */
	public verbose(message: string | Error): void {
		if (this.flags.verbose || this.redirectLogToTrace) {
			if (this.redirectLogToTrace) {
				this.traceVerbose?.(message);
			} else {
				this.logger.verbose(message);
			}
		}
	}
}

/**
 * Logs a message with an indent.
 * @public
 */
export function logIndent(input: string, logger: Logger, indentNumber = 2) {
	const message = indentString(input, indentNumber);
	logger.log(message);
}

/**
 * Indent text by prepending spaces.
 */
function indentString(str: string, indentNumber = 2): string {
	return `${" ".repeat(indentNumber)}${str}`;
}

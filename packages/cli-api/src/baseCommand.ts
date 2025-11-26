import { Command, type Interfaces, Flags as OclifFlags } from "@oclif/core";
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
 * @remarks
 * This class provides a pluggable logger architecture. Subclasses can override the `_logger` property
 * to use a different logger implementation. The `logger` getter returns a Logger-compatible object
 * that can be passed to utility functions expecting a Logger.
 *
 * @public
 */
export abstract class BaseCommand<T extends typeof Command> extends Command {
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
	 * The internal Logger instance that the command will use for logging.
	 * Override this in subclasses to use a different logger implementation.
	 */
	protected _logger: Logger = BasicLogger;

	/**
	 * Returns a Logger-compatible object that can be passed to utility functions expecting a Logger.
	 *
	 * @remarks
	 * This getter provides a clean separation between:
	 * - Command methods (log, info, warning, etc.) which respect flags like --quiet
	 * - The Logger interface which utility functions can use directly
	 *
	 * The returned logger respects the command's suppressLogging flag.
	 */
	public get logger(): Logger {
		return {
			log: (message?: string, ...args: unknown[]) => this.log(message, ...args),
			success: (message?: string, ...args: unknown[]) =>
				this.success(message ?? "", ...args),
			info: (message: string | Error | undefined, ...args: unknown[]) =>
				this.info(message, ...args),
			warning: (message: string | Error | undefined, ...args: unknown[]) =>
				this.warning(message, ...args),
			error: (message: string | Error | undefined, ...args: unknown[]) =>
				this.logError(message, ...args),
			verbose: (message: string | Error | undefined, ...args: unknown[]) =>
				this.verbose(message, ...args),
		};
	}

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
			baseFlags: (super.ctor as unknown as typeof BaseCommand).baseFlags,
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
	public override log(message?: string, ..._args: unknown[]): void {
		this._logger.log(message ?? "");
	}

	/**
	 * Logs a success message.
	 */
	public success(message?: string, ..._args: unknown[]) {
		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this._logger.success(message ?? "");
		}
		if (this.redirectLogToTrace) {
			this.traceInfo?.(message);
		}
	}

	/**
	 * Logs an informational message.
	 */
	public info(message: string | Error | undefined, ..._args: unknown[]) {
		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this._logger.info(message);
		}
		if (this.redirectLogToTrace) {
			this.traceInfo?.(message);
		}
	}

	/**
	 * Logs an error without exiting.
	 *
	 * @remarks
	 * This method logs an error message without terminating the process.
	 * Use the `exit` method if you want to log and exit the process.
	 */
	public logError(
		message: string | Error | undefined,
		..._args: unknown[]
	): void {
		if (!this.suppressLogging) {
			this._logger.error(message);
		}
	}

	/**
	 * Logs an error and exits the process.
	 *
	 * @param code - Exit code (default: 1)
	 */
	public override exit(code?: number): never;
	/**
	 * Logs an error message and exits the process.
	 *
	 * @param message - Error message or Error object to log
	 * @param code - Exit code (default: 1)
	 */
	public override exit(message: string | Error, code?: number): never;
	public override exit(
		messageOrCode?: string | Error | number,
		code = 1,
	): never {
		if (typeof messageOrCode === "number") {
			// Called as exit(code)
			return super.exit(messageOrCode) as never;
		}

		if (messageOrCode) {
			// Log the error if logging is enabled
			if (!this.suppressLogging) {
				this._logger.error(messageOrCode);
			}
			// Use OCLIF's error method to properly exit with message (captured by test framework)
			// We call the parent's error method directly to bypass our override
			return Command.prototype.error.call(this, messageOrCode, {
				exit: code,
			}) as never;
		}
		return super.exit(code) as never;
	}

	/**
	 * Logs a warning.
	 */
	public warning(
		message: string | Error | undefined,
		..._args: unknown[]
	): void {
		if (!(this.suppressLogging || this.redirectLogToTrace)) {
			this._logger.warning(message);
		}
		if (this.redirectLogToTrace) {
			this.traceWarning?.(message);
		}
	}

	/**
	 * Logs a warning with a stack trace in debug mode.
	 */
	public warningWithDebugTrace(message: string | Error | undefined): void {
		if (this.suppressLogging && !this.redirectLogToTrace) {
			return;
		}
		if (this.redirectLogToTrace) {
			this.traceWarning?.(message);
		}
		this._logger.warning(message);
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
	 * Logs a verbose log statement.
	 */
	public verbose(
		message: string | Error | undefined,
		..._args: unknown[]
	): void {
		if (this.flags.verbose || this.redirectLogToTrace) {
			if (this.redirectLogToTrace) {
				this.traceVerbose?.(message);
			} else {
				this._logger.verbose(message);
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

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
 * @public
 */
export abstract class BaseCommand<T extends typeof Command>
	extends Command
	implements Omit<Logger, "error">
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
	 * Logs an error without exiting. Implements {@link Logger.error}.
	 *
	 * @remarks
	 * This method intentionally shadows OCLIF Command.error() to provide non-exiting error logging.
	 * OCLIF's error() method (which exits the process) is not available.
	 * Use {@link BaseCommand.(exit:1)} if you want to log and exit the process.
	 *
	 * TypeScript complains about incompatible signatures, but this is intentional:
	 * - OCLIF's error(): takes options, returns never (exits process)
	 * - Our error(): simple signature, returns void (doesn't exit)
	 * At runtime, our method completely replaces the parent's.
	 */
	// @ts-expect-error - Intentionally incompatible with Command.error() signature
	public error(message: string | Error): void {
		if (!this.suppressLogging) {
			this.logger.error(message);
		}
	}

	/**
	 * @deprecated OCLIF's error() method is not available. Use error() for logging or exit() to exit.
	 * @internal
	 */
	// @ts-expect-error - Make OCLIF's error() signature uncallable
	// biome-ignore lint/suspicious/noDuplicateClassMembers: Intentionally shadowing OCLIF's error() method
	public override error(_input: never, _options?: never): never {
		throw new Error(
			"Do not use the OCLIF error() method. Use this.error(msg) to log without exiting, or this.exit(msg) to log and exit.",
		);
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
				this.logger.error(messageOrCode);
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

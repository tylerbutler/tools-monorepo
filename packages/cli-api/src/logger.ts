import type { Command } from "@oclif/core";
import chalk from "picocolors";

export type OclifCommandLogger = Pick<Command, "log" | "warn" | "error">;

/**
 * A function that logs an Error or error message.
 *
 * @public
 */
export type ErrorLoggingFunction = (
	msg: string | Error,
	...args: unknown[]
) => void;

/**
 * A function that logs an error message.
 *
 * @public
 */
export type LoggingFunction = (message: string, ...args: unknown[]) => void;

/**
 * A general-purpose logger object.
 *
 * @remarks
 *
 * The `log` method is the primary logging function. The other functions can be used to support logging at different
 * levels. Methods other than `log` may modify the error message in some way (e.g. by prepending some text to it).
 *
 * @public
 */
export interface Logger {
	/**
	 * Logs an error message as-is.
	 */
	log: LoggingFunction;

	/**
	 * Logs an informational message.
	 */
	info: ErrorLoggingFunction;

	/**
	 * Logs a warning message.
	 */
	warning: ErrorLoggingFunction;

	/**
	 * Logs an error message.
	 *
	 * @remarks
	 *
	 * This method is not named 'error' because it conflicts with the method that oclif has on its Command class.
	 * That method exits the process in addition to logging, so this method exists to differentiate, and provide
	 * error logging that doesn't exit the process.
	 */
	errorLog: ErrorLoggingFunction;

	/**
	 * Logs a verbose message.
	 */
	verbose: ErrorLoggingFunction;

	formatError?: ((message: Error | string) => string) | undefined;
}

export function setCommandLogger(command: Logger, logger: Logger) {
	command.log = logger.log;
	command.warning = logger.warning;
	command.info = logger.info;
	command.verbose = logger.verbose;
	command.errorLog = logger.errorLog;
	command.formatError = logger.formatError;
}

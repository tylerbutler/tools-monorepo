import type { Command } from "@oclif/core";
import chalk from "picocolors";

export type OclifCommandLogger = Pick<Command, "log" | "warn" | "error">;

/**
 * A function that logs an Error or error message.
 *
 * @public
 */
export type ErrorLoggingFunction = (
	msg: string | Error | undefined,
	...args: unknown[]
) => void;

/**
 * A function that logs a message.
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
	 * Logs a message as-is. Allows optional message for blank lines.
	 */
	log: (message?: string, ...args: unknown[]) => void;

	/**
	 * Logs a success message. Message is required.
	 */
	success: LoggingFunction;

	/**
	 * Logs an informational message. Message is required.
	 */
	info: ErrorLoggingFunction;

	/**
	 * Logs a warning message. Message is required.
	 */
	warning: ErrorLoggingFunction;

	/**
	 * Logs an error message without exiting. Message is required.
	 *
	 * @remarks
	 * This method is named `errorLog` instead of `error` to avoid conflicts with OCLIF's Command.error()
	 * method which exits the process. This method only logs and does not exit.
	 */
	errorLog: ErrorLoggingFunction;

	/**
	 * Logs a verbose message. Message is required.
	 */
	verbose: ErrorLoggingFunction;

	formatError?: ((message: Error | string) => string) | undefined;
}

export function logWithTime(
	msg: string | Error,
	logFunc: ErrorLoggingFunction,
) {
	const date = new Date();
	let hours = date.getHours().toString();
	if (hours.length === 1) {
		hours = `0${hours}`;
	}
	let mins = date.getMinutes().toString();
	if (mins.length === 1) {
		mins = `0${mins}`;
	}
	let secs = date.getSeconds().toString();
	if (secs.length === 1) {
		secs = `0${secs}`;
	}
	const msgString = typeof msg === "string" ? msg : msg.message;
	logFunc(chalk.yellow(`[${hours}:${mins}:${secs}] `) + msgString);
}

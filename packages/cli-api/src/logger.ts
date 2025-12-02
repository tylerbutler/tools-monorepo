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
 * A function that logs a message. Message is optional to support blank line logging.
 *
 * @public
 */
export type LoggingFunction = (message?: string, ...args: unknown[]) => void;

/**
 * A general-purpose logger interface for CLI applications.
 *
 * @remarks
 * The Logger interface provides a consistent API for logging at different severity levels.
 * Implementations can customize output formatting (colors, icons, prefixes) while commands
 * use the same logging methods.
 *
 * Built-in implementations:
 * - {@link BasicLogger} - Simple console output with colored prefixes (default)
 * - {@link ConsolaLogger} - Rich formatting with icons via consola library (alpha)
 *
 * To create a custom logger, implement this interface:
 *
 * @example
 * ```typescript
 * const MyLogger: Logger = {
 *   log: (msg) => console.log(msg),
 *   success: (msg) => console.log(`✓ ${msg}`),
 *   info: (msg) => console.log(`ℹ ${msg instanceof Error ? msg.message : msg}`),
 *   warning: (msg) => console.warn(`⚠ ${msg instanceof Error ? msg.message : msg}`),
 *   error: (msg) => console.error(`✖ ${msg instanceof Error ? msg.message : msg}`),
 *   verbose: (msg) => console.log(`[verbose] ${msg instanceof Error ? msg.message : msg}`),
 * };
 * ```
 *
 * @public
 */
export interface Logger {
	/**
	 * Logs a message as-is to stdout. Allows optional message for blank lines.
	 */
	log: (message?: string, ...args: unknown[]) => void;

	/**
	 * Logs a success message (typically with green/positive formatting).
	 */
	success: LoggingFunction;

	/**
	 * Logs an informational message.
	 */
	info: ErrorLoggingFunction;

	/**
	 * Logs a warning message (typically with yellow/caution formatting).
	 */
	warning: ErrorLoggingFunction;

	/**
	 * Logs an error message to stderr without exiting (typically with red/error formatting).
	 */
	error: ErrorLoggingFunction;

	/**
	 * Logs a verbose/debug message. In commands, only shown when --verbose flag is enabled.
	 */
	verbose: ErrorLoggingFunction;

	/**
	 * Optional hook to customize error formatting for Error objects.
	 */
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

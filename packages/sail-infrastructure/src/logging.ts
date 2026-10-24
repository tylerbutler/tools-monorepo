import chalk from "picocolors";

/**
 * A function that logs an Error or error message.
 */
export type ErrorLoggingFunction = (
	msg: string | Error | undefined,
	// biome-ignore lint/suspicious/noExplicitAny: Required for flexible logging function signature
	...args: any[]
) => void;

/**
 * A function that logs an error message.
 */
// biome-ignore lint/suspicious/noExplicitAny: Required for flexible logging function signature
export type LoggingFunction = (message?: string, ...args: any[]) => void;

/**
 * A general-purpose logger object.
 *
 * @remarks
 *
 * The `log` method is the primary logging function. The other functions can be used to support logging at different
 * levels. Methods other than `log` may modify the error message in some way (e.g. by prepending some text to it).
 */
export interface Logger {
	/**
	 * Logs an error message as-is.
	 */
	log: LoggingFunction;

	/**
	 * Logs a success message.
	 */
	success: LoggingFunction;

	/**
	 * Logs an informational message.
	 */
	info: ErrorLoggingFunction;

	/**
	 * Logs a warning message.
	 */
	warning: ErrorLoggingFunction;

	/**
	 * Logs an error message without exiting.
	 *
	 * @remarks
	 *
	 * This method logs errors to stderr but does not exit the process. For commands that need to exit
	 * on error, use OCLIF's built-in error() method instead.
	 */
	error: ErrorLoggingFunction;

	/**
	 * Logs a verbose message.
	 */
	verbose: ErrorLoggingFunction;

	/**
	 * Optional function to format error messages.
	 */
	formatError?: ((message: Error | string) => string) | undefined;
}

/**
 * A {@link Logger} that logs directly to the console.
 */
export const defaultLogger: Logger = {
	/**
	 * {@inheritDoc Logger.log}
	 */
	log,

	/**
	 * {@inheritDoc Logger.success}
	 */
	success,

	/**
	 * {@inheritDoc Logger.info}
	 */
	info,

	/**
	 * {@inheritDoc Logger.warning}
	 */
	warning,

	/**
	 * {@inheritDoc Logger.error}
	 */
	error: errorLog,

	/**
	 * {@inheritDoc Logger.verbose}
	 */
	verbose,
};

function logWithTime(
	msg: string | Error | undefined,
	logFunc: ErrorLoggingFunction,
): void {
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
	// eslint-disable-next-line @typescript-eslint/restrict-plus-operands
	logFunc(chalk.yellow(`[${hours}:${mins}:${secs}] `) + msg);
}

function log(msg: string | undefined): void {
	// biome-ignore lint/suspicious/noConsole: This is a logging utility
	logWithTime(msg, console.log);
}

function success(msg: string | undefined): void {
	// biome-ignore lint/suspicious/noConsole: This is a logging utility
	logWithTime(`${chalk.green("SUCCESS")}: ${msg}`, console.log);
}

function info(msg: string | Error | undefined): void {
	// biome-ignore lint/suspicious/noConsole: This is a logging utility
	logWithTime(`INFO: ${msg}`, console.log);
}

function verbose(msg: string | Error | undefined): void {
	// biome-ignore lint/suspicious/noConsole: This is a logging utility
	logWithTime(`VERBOSE: ${msg}`, console.log);
}

function warning(msg: string | Error | undefined): void {
	// biome-ignore lint/suspicious/noConsole: This is a logging utility
	logWithTime(`${chalk.yellow("WARNING")}: ${msg}`, console.log);
}

function errorLog(msg: string | Error | undefined): void {
	// biome-ignore lint/suspicious/noConsole: This is a logging utility
	logWithTime(`${chalk.red("ERROR")}: ${msg}`, console.error);
}

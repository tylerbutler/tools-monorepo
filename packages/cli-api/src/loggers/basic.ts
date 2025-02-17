import chalk from "picocolors";
import type { ErrorLoggingFunction, Logger } from "../logger.js";

function formatError(message: Error | string): string {
	const formatted =
		typeof message === "string"
			? message
			: [message?.message, message?.stack].join("\n");

	return formatted;
}

function logWithTime(
	msg: string | Error | undefined,
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
	logFunc(chalk.yellow(`[${hours}:${mins}:${secs}] `) + msg);
}

function log(msg: string | undefined): void {
	logWithTime(msg, console.log);
}

function info(msg: string | Error | undefined) {
	logWithTime(`INFO: ${msg}`, console.log);
}

function verbose(msg: string | Error | undefined) {
	logWithTime(`VERBOSE: ${msg}`, console.log);
}

function warning(msg: string | Error | undefined) {
	logWithTime(`${chalk.yellow("WARNING")}: ${msg}`, console.log);
}

function errorLog(msg: string | Error | undefined) {
	logWithTime(`${chalk.red("ERROR")}: ${msg}`, console.error);
}

/**
 * A {@link Logger} that logs directly to the console.
 */
export const basicLogger: Logger = {
	/**
	 * {@inheritDoc Logger.log}
	 */
	log,

	/**
	 * {@inheritDoc Logger.info}
	 */
	info,

	/**
	 * {@inheritDoc Logger.warning}
	 */
	warning,

	/**
	 * {@inheritDoc Logger.errorLog}
	 */
	errorLog,

	/**
	 * {@inheritDoc Logger.verbose}
	 */
	verbose,

	/**
	 * {@inheritDoc Logger.formatError}
	 */
	formatError,
};

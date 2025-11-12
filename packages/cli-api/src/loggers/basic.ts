import chalk from "picocolors";
import type { Logger } from "../logger.js";

function formatError(message: Error | string): string {
	const formatted =
		typeof message === "string"
			? message
			: [message?.message, message?.stack].join("\n");

	return formatted;
}

function log(msg?: string): void {
	// biome-ignore lint/suspicious/noConsole: logging is the purpose of this function
	console.log(msg ?? "");
}

function success(msg: string) {
	log(`${chalk.green("SUCCESS")}: ${msg}`);
}

function info(msg: string | Error) {
	log(`INFO: ${formatError(msg)}`);
}

function verbose(msg: string | Error) {
	log(`VERBOSE: ${formatError(msg)}`);
}

function warning(msg: string | Error) {
	log(`${chalk.yellow("WARNING")}: ${formatError(msg)}`);
}

function errorLog(msg: string | Error) {
	// biome-ignore lint/suspicious/noConsole: logging is the purpose of this function
	console.error(`${chalk.red("ERROR")}: ${formatError(msg)}`);
}

/**
 * A {@link Logger} that logs directly to the console.
 */
export const BasicLogger: Logger = {
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
	 * {@inheritDoc Logger.success}
	 */
	success,
};

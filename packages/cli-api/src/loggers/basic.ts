import chalk from "picocolors";
import type { Logger } from "../logger.js";

function formatError(message: Error | string | undefined): string {
	if (message === undefined) {
		return "";
	}
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

function success(msg?: string) {
	log(`${chalk.green("SUCCESS")}: ${msg ?? ""}`);
}

function info(msg: string | Error | undefined) {
	log(`INFO: ${formatError(msg)}`);
}

function verbose(msg: string | Error | undefined) {
	log(`VERBOSE: ${formatError(msg)}`);
}

function warning(msg: string | Error | undefined) {
	log(`${chalk.yellow("WARNING")}: ${formatError(msg)}`);
}

function error(msg: string | Error | undefined) {
	// biome-ignore lint/suspicious/noConsole: logging is the purpose of this function
	console.error(`${chalk.red("ERROR")}: ${formatError(msg)}`);
}

/**
 * A {@link Logger} that logs directly to the console.
 *
 * @public
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
	 * {@inheritDoc Logger.error}
	 */
	error,

	/**
	 * {@inheritDoc Logger.verbose}
	 */
	verbose,

	/**
	 * {@inheritDoc Logger.success}
	 */
	success,
};

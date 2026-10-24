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
 * Creates a {@link Logger} with simple console output and colored prefixes.
 *
 * @remarks
 * This factory function returns a logger that outputs to the console with
 * colored prefixes for different severity levels:
 * - SUCCESS: green prefix
 * - WARNING: yellow prefix
 * - ERROR: red prefix (to stderr)
 *
 * @returns A Logger instance
 *
 * @public
 */
export function createBasicLogger(): Logger {
	return BasicLogger;
}

/**
 * A {@link Logger} that logs directly to the console with colored prefixes.
 *
 * @remarks
 * This is the default logger implementation. Use {@link createBasicLogger} to
 * obtain an instance of this logger.
 *
 * @internal
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

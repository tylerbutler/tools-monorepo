import type { ConsolaReporter, LogObject } from "consola";
import chalk from "picocolors";

/**
 * Available prefix styles for the logger.
 *
 * @remarks
 * - `capsule` - Bracketed prefixes like `[NOTE]`, `[INFO]`, `[WARNING]`
 * - `candy-wrapper` - Hash prefixes like `# NOTE`, `# INFO`, `# WARNING`
 * - `tape` - Comment-style prefixes like `// NOTE`, `// INFO`, `// WARNING`
 *
 * @public
 */
export type PrefixStyle = "capsule" | "candy-wrapper" | "tape";

/**
 * Options for creating a prefix reporter.
 *
 * @public
 */
export interface PrefixReporterOptions {
	/**
	 * The prefix style to use.
	 */
	style: PrefixStyle;

	/**
	 * Whether to colorize the prefixes. Defaults to true.
	 */
	colors?: boolean;
}

/**
 * Internal level names used for prefix lookup.
 */
type LogLevel =
	| "note"
	| "info"
	| "warning"
	| "error"
	| "verbose"
	| "fatal"
	| "debug"
	| "trace";

/**
 * Prefix format definitions for each style.
 */
const prefixFormats: Record<PrefixStyle, Record<LogLevel, string>> = {
	capsule: {
		note: "[NOTE]",
		info: "[INFO]",
		warning: "[WARNING]",
		error: "[ERROR]",
		verbose: "[VERBOSE]",
		fatal: "[FATAL]",
		debug: "[DEBUG]",
		trace: "[TRACE]",
	},
	"candy-wrapper": {
		note: "# NOTE",
		info: "# INFO",
		warning: "# WARNING",
		error: "# ERROR",
		verbose: "# VERBOSE",
		fatal: "# FATAL",
		debug: "# DEBUG",
		trace: "# TRACE",
	},
	tape: {
		note: "// NOTE",
		info: "// INFO",
		warning: "// WARNING",
		error: "// ERROR",
		verbose: "// VERBOSE",
		fatal: "// FATAL",
		debug: "// DEBUG",
		trace: "// TRACE",
	},
};

/**
 * Maps consola log types to our internal level names.
 */
const typeToLevel: Record<string, LogLevel> = {
	success: "note",
	info: "info",
	warn: "warning",
	error: "error",
	log: "info",
	verbose: "verbose",
	// Extended levels
	fatal: "fatal",
	debug: "debug",
	trace: "trace",
};

/**
 * Applies color formatting to a prefix based on the log level.
 *
 * @param level - The log level
 * @param prefix - The prefix string to colorize
 * @param useColors - Whether to apply colors
 * @returns The colorized (or plain) prefix
 */
function colorize(level: LogLevel, prefix: string, useColors: boolean): string {
	if (!useColors) {
		return prefix;
	}

	switch (level) {
		case "note":
			return chalk.green(prefix);
		case "warning":
			return chalk.yellow(prefix);
		case "error":
			return chalk.red(prefix);
		case "fatal":
			return chalk.bold(chalk.red(prefix));
		default:
			return prefix;
	}
}

/**
 * Formats a log message from the log object's arguments.
 *
 * @param logObj - The consola log object
 * @returns Formatted message string
 */
function formatMessage(logObj: LogObject): string {
	return logObj.args
		.map((arg) => {
			if (arg instanceof Error) {
				return [arg.message, arg.stack].filter(Boolean).join("\n");
			}
			return String(arg);
		})
		.join(" ");
}

/**
 * Creates a consola reporter that formats log messages with configurable prefix styles.
 *
 * @remarks
 * This reporter formats log output with styled prefixes. The SUCCESS level is rendered
 * as NOTE across all styles.
 *
 * @example
 * ```typescript
 * import { createConsola } from "consola";
 * import { createPrefixReporter } from "@tylerbu/cli-api/loggers/prefixReporter";
 *
 * const consola = createConsola({
 *   reporters: [createPrefixReporter({ style: "capsule" })],
 * });
 *
 * consola.success("Task completed"); // [NOTE] Task completed
 * consola.info("Processing...");     // [INFO] Processing...
 * consola.warn("Check config");      // [WARNING] Check config
 * consola.error("Failed");           // [ERROR] Failed
 * ```
 *
 * @param options - Configuration options for the reporter
 * @returns A consola reporter instance
 *
 * @public
 */
export function createPrefixReporter(
	options: PrefixReporterOptions,
): ConsolaReporter {
	const { style, colors = true } = options;
	const prefixes = prefixFormats[style];

	return {
		log: (logObj: LogObject) => {
			const level = typeToLevel[logObj.type] ?? "info";
			const prefix = prefixes[level];
			const coloredPrefix = colorize(level, prefix, colors);
			const message = formatMessage(logObj);

			if (logObj.type === "error" || logObj.type === "fatal") {
				// biome-ignore lint/suspicious/noConsole: logging is the purpose of this function
				console.error(`${coloredPrefix} ${message}`);
			} else {
				// biome-ignore lint/suspicious/noConsole: logging is the purpose of this function
				console.log(`${coloredPrefix} ${message}`);
			}
		},
	};
}

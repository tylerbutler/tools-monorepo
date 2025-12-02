import { createConsola, LogLevels } from "consola";
import type { ExtendedLogger, Logger } from "../logger.js";
import { createPrefixReporter, type PrefixStyle } from "./prefixReporter.js";

/**
 * Options for creating a consola-based logger.
 *
 * @public
 */
export interface ConsolaLoggerOptions {
	/**
	 * Whether to colorize the output. Defaults to true.
	 */
	colors?: boolean;
}

const consola = createConsola({
	level: LogLevels.info,
	fancy: true,
	formatOptions: {
		// columns: 80,
		colors: true,
		compact: false,
		date: false,
	},
});

/**
 * A {@link Logger} with rich formatting using the consola library.
 *
 * @remarks
 * ConsolaLogger provides enhanced visual output with icons and colors.
 * Requires the `consola` peer dependency to be installed.
 *
 * Installation:
 * ```bash
 * pnpm add consola
 * ```
 *
 * Output format:
 * ```
 * ✔ Build completed successfully
 * ℹ Processing 5 files
 * ⚠ Config file not found, using defaults
 * ✖ Failed to read package.json
 * ```
 *
 * @example
 * ```typescript
 * import { ConsolaLogger } from "@tylerbu/cli-api/loggers/consola.js";
 *
 * export default class MyCommand extends BaseCommand<typeof MyCommand> {
 *   protected override _logger = ConsolaLogger;
 * }
 * ```
 *
 * @alpha
 */
export const ConsolaLogger: Logger = {
	log: consola.log,
	success: consola.success,
	info: consola.info,
	warning: consola.warn,
	error: consola.error,
	verbose: consola.verbose,
} as const;

/**
 * Formats an error or string message for logging.
 */
function formatError(message: Error | string | undefined): string {
	if (message === undefined) {
		return "";
	}
	return typeof message === "string"
		? message
		: [message?.message, message?.stack].filter(Boolean).join("\n");
}

/**
 * Creates a {@link Logger} with configurable prefix styles using consola.
 *
 * @remarks
 * This factory function creates a logger that formats output with styled prefixes.
 * The SUCCESS level is rendered as NOTE across all styles.
 *
 * Available styles:
 * - `capsule` - Bracketed prefixes: `[NOTE]`, `[INFO]`, `[WARNING]`, `[ERROR]`, `[VERBOSE]`
 * - `candy-wrapper` - Hash prefixes: `# NOTE`, `# INFO`, `# WARNING`, `# ERROR`, `# VERBOSE`
 * - `tape` - Comment prefixes: `// NOTE`, `// INFO`, `// WARNING`, `// ERROR`, `// VERBOSE`
 *
 * @example
 * ```typescript
 * import { createConsolaLogger } from "@tylerbu/cli-api";
 *
 * // Create a logger with capsule style
 * const logger = createConsolaLogger("capsule");
 * logger.success("Done!");  // [NOTE] Done!
 * logger.info("Working.."); // [INFO] Working..
 *
 * // Disable colors
 * const plainLogger = createConsolaLogger("tape", { colors: false });
 * ```
 *
 * @param style - The prefix style to use
 * @param options - Optional configuration
 * @returns A Logger instance
 *
 * @public
 */
export function createConsolaLogger(
	style: PrefixStyle,
	options?: ConsolaLoggerOptions,
): Logger {
	const { colors = true } = options ?? {};

	const styledConsola = createConsola({
		level: LogLevels.verbose,
		reporters: [createPrefixReporter({ style, colors })],
	});

	return {
		log: (msg?: string) => styledConsola.log(msg ?? ""),
		success: (msg?: string) => styledConsola.success(msg ?? ""),
		info: (msg) => styledConsola.info(formatError(msg)),
		warning: (msg) => styledConsola.warn(formatError(msg)),
		error: (msg) => styledConsola.error(formatError(msg)),
		verbose: (msg) => styledConsola.verbose(formatError(msg)),
	};
}

/**
 * Creates an {@link ExtendedLogger} with configurable prefix styles using consola.
 *
 * @remarks
 * This factory function creates an extended logger with additional severity levels
 * (fatal, debug, trace) beyond the base Logger interface.
 *
 * Available styles:
 * - `capsule` - Bracketed prefixes: `[FATAL]`, `[DEBUG]`, `[TRACE]`
 * - `candy-wrapper` - Hash prefixes: `# FATAL`, `# DEBUG`, `# TRACE`
 * - `tape` - Comment prefixes: `// FATAL`, `// DEBUG`, `// TRACE`
 *
 * @example
 * ```typescript
 * import { createExtendedConsolaLogger } from "@tylerbu/cli-api";
 *
 * const logger = createExtendedConsolaLogger("capsule");
 * logger.fatal("Critical failure!");  // [FATAL] Critical failure!
 * logger.debug("Debug info");         // [DEBUG] Debug info
 * logger.trace("Trace details");      // [TRACE] Trace details
 * ```
 *
 * @param style - The prefix style to use
 * @param options - Optional configuration
 * @returns An ExtendedLogger instance
 *
 * @public
 */
export function createExtendedConsolaLogger(
	style: PrefixStyle,
	options?: ConsolaLoggerOptions,
): ExtendedLogger {
	const { colors = true } = options ?? {};

	const styledConsola = createConsola({
		level: LogLevels.trace,
		reporters: [createPrefixReporter({ style, colors })],
	});

	return {
		log: (msg?: string) => styledConsola.log(msg ?? ""),
		success: (msg?: string) => styledConsola.success(msg ?? ""),
		info: (msg) => styledConsola.info(formatError(msg)),
		warning: (msg) => styledConsola.warn(formatError(msg)),
		error: (msg) => styledConsola.error(formatError(msg)),
		verbose: (msg) => styledConsola.verbose(formatError(msg)),
		fatal: (msg) => styledConsola.fatal(formatError(msg)),
		debug: (msg) => styledConsola.debug(formatError(msg)),
		trace: (msg) => styledConsola.trace(formatError(msg)),
	};
}
